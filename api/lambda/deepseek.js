const fetch = require('node-fetch');

// DeepSeek API configuration
const DEEPSEEK_API_ENDPOINT = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

exports.handler = async (event) => {
    // Set up CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // Handle OPTIONS requests (CORS preflight)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        // Parse request body
        const requestBody = JSON.parse(event.body);

        // Validate request
        if (!requestBody.messages || !Array.isArray(requestBody.messages)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Invalid request format'
                })
            };
        }

        // Call DeepSeek API
        const response = await fetch(DEEPSEEK_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: requestBody.model || 'deepseek-chat',
                messages: requestBody.messages,
                temperature: requestBody.temperature || 0.3,
                max_tokens: requestBody.max_tokens || 2000
            })
        });

        const data = await response.json();

        // Check for API errors
        if (!response.ok) {
            console.error('DeepSeek API error:', data);
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({
                    error: 'DeepSeek API Error',
                    message: data.error?.message || 'Unknown error'
                })
            };
        }

        // Return successful response
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data)
        };
    } catch (error) {
        console.error('Lambda function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal Server Error',
                message: error.message
            })
        };
    }
}; 