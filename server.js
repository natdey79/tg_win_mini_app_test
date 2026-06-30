require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ============================================================
// TELEGRAM DATA VALIDATION (CRITICAL FOR SECURITY)
// ============================================================

function validateTelegramData(initData, botToken) {
    try {
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        params.delete('hash');
        
        // Sort params alphabetically
        const sortedParams = Array.from(params.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        
        // Create HMAC
        const secretKey = crypto
            .createHash('sha256')
            .update(botToken)
            .digest();
        
        const computedHash = crypto
            .createHmac('sha256', secretKey)
            .update(sortedParams)
            .digest('hex');
        
        return computedHash === hash;
    } catch (error) {
        console.error('Validation error:', error);
        return false;
    }
}

// ============================================================
// API ENDPOINTS
// ============================================================

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Save task (with Telegram validation)
app.post('/api/tasks', (req, res) => {
    try {
        const { tasks, initData } = req.body;
        const botToken = process.env.BOT_TOKEN;
        
        // Validate request
        if (!initData || !botToken) {
            return res.status(400).json({ error: 'Missing required data' });
        }
        
        // Validate Telegram data
        const isValid = validateTelegramData(initData, botToken);
        if (!isValid) {
            console.warn('Invalid Telegram data received');
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // Get user ID from Telegram data
        const userData = JSON.parse(
            Object.fromEntries(new URLSearchParams(initData))?.user || '{}'
        );
        const userId = userData?.id || 'unknown';
        
        // Here you would save to a database
        // For demo, we'll just log and return success
        console.log(`📝 User ${userId} has ${tasks.length} tasks`);
        
        res.json({
            success: true,
            message: 'Tasks saved successfully',
            userId: userId,
            taskCount: tasks.length
        });
        
    } catch (error) {
        console.error('Error saving tasks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get tasks (with Telegram validation)
app.get('/api/tasks', (req, res) => {
    try {
        const { initData } = req.query;
        const botToken = process.env.BOT_TOKEN;
        
        if (!initData || !botToken) {
            return res.status(400).json({ error: 'Missing required data' });
        }
        
        const isValid = validateTelegramData(initData, botToken);
        if (!isValid) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // In a real app, you would fetch from database
        // For demo, return empty array
        res.json({
            success: true,
            tasks: [],
            message: 'Retrieved tasks successfully'
        });
        
    } catch (error) {
        console.error('Error getting tasks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
});