import express from 'express';
import fetch from 'node-fetch';

const ENV = 'development'
const router = express.Router();

const auth_url = ENV === 'development' ? "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials" : "";
const req_url = ENV === 'development' ? "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest" : "";

router.post('/mpesa', async (req, res) => {
    try {
        const x = "KpbGsvcAnfEp83MEGZGMC8gteNxWDyKIOHjSXOAz2yiTrFk2";
        const y = "wDMzqjrzvg0InA8n7gAJJ0QMGT1HO4fSyqRqZAZP7xXT5AEyErHwLQGLWZUZBbDI"; 
        const { amount, phone } = req.body;
       
        if (!x || !y) {
            throw new Error('M-Pesa credentials not found in environment variables');
        }

        if (!amount || !phone) throw new Error('Got missing or null creds ');

        const token = Buffer.from(`${x}:${y}`).toString('base64');

        const get_access_token = async () => {
            try {
            const authResponse = await fetch("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
                headers: {
                    'Authorization': `Basic ${token}`,
                    'Content-Type': 'application/json' 
                }
            });
        
            if (!authResponse.ok) {
                const errorBody = await authResponse.text();
                console.error('Auth failed details:', errorBody);
                throw new Error(`Auth failed with status ${authResponse.status}: ${authResponse.statusText}`);
            }
            
            const authData = await authResponse.json();
            const { access_token } = authData;
            return access_token;
        
            } catch (error) {
                console.error('Full authentication error:', error);
                throw new Error(`M-Pesa authentication failed: ${error.message}`);
            }
        }
        

        const access_token = await get_access_token();
        const pad = (n) => (n < 10 ? '0' + n : n);
        const now = new Date();

        const timestamp = 
            now.getFullYear().toString() +
            pad(now.getMonth() + 1) +
            pad(now.getDate()) +
            pad(now.getHours()) +
            pad(now.getMinutes()) +
            pad(now.getSeconds());


        // Use environment variable for passkey or sandbox default
        const passkey = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
        const password = Buffer.from(`174379${passkey}${timestamp}`).toString('base64');

        // For sandbox testing
        const businessShortCode = "174379"; 
        const partyB = "174379"; // Should match BusinessShortCode for sandbox

        const req_body = {
            BusinessShortCode: businessShortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: amount,
            PartyA: phone,
            PartyB: partyB,
            PhoneNumber: phone,
            CallBackURL: "https://empirehubphones.onrender.com/api/buy/callback", // Must be HTTPS and accessible
            AccountReference: "Test Payment",
            TransactionDesc: "Payment for services"
        };

        const pushSTK = async () => {
            try {
                const stkResponse = await fetch("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(req_body)
                });

                if (!stkResponse.ok) {
                    const errorDetails = await stkResponse.text();
                    console.error('STK Push Error Details:', errorDetails);
                    throw new Error(`STK Push failed: ${stkResponse.statusText}`);
                }

                const responseData = await stkResponse.json();
                console.log('STK Push Response:', responseData);
                return responseData;

            } catch (error) {
                console.error('Full STK Push Error:', error);
                throw error;
            }
        }
        const stkData = await pushSTK();
        
        switch (stkData.ResponseCode) {
            case '0':
                return res.status(200).json({ 
                    success: true, 
                    message: "STK push initiated successfully",
                    data: stkData
                });
                
            
            default:
                return res.status(400).json({
                    success: false,
                    message: `Payment failed with code: ${stkData.ResponseCode}`,
                    data: stkData
                });
        }
        
    } catch (error) {
        console.error("M-Pesa Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
});

router.post('/callback', async (req, res) => {
    try {
        const callbackData = req.body;
        
        if (!callbackData.Body.stkCallback) {
            return res.status(400).json({ error: "Invalid callback format" });
        }
        
        const { ResultCode, ResultDesc, CallbackMetadata } = callbackData.Body.stkCallback;
        
        if (ResultCode !== "0") {
            console.error("Payment failed:", ResultDesc);
            
            return res.status(200).json({ success: false }); 
        }
        
        
        const metadata = {};
        CallbackMetadata.Item.forEach(item => {
            metadata[item.Name] = item.Value;
        });
        
        
        console.log("Payment successful:", metadata);
        
        return res.status(200).json({ success: true }); 
        
    } catch (error) {
        console.error("Callback error:", error);
        return res.status(200).json({ success: false }); 
    }
});

export default router;