async function testDemoLogins() {
    const API_URL = 'http://localhost:5000/api';

    const demoAccounts = [
        { email: 'worker@test.com', firebaseUid: 'demo-worker-uid' },
        { email: 'buyer@test.com', firebaseUid: 'demo-buyer-uid' },
        { email: 'admin@microtask.com', firebaseUid: 'demo-admin-uid' }
    ];

    console.log('Testing Demo Logins on Backend...');

    for (const account of demoAccounts) {
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(account)
            });

            const data = await response.json();

            if (response.ok) {
                console.log(`[SUCCESS] Login for ${account.email}:`, data.message);
                console.log(`   User Role: ${data.user.role}`);
                console.log(`   Token Received: ${data.token.substring(0, 20)}...`);
            } else {
                console.error(`[FAILED] Login for ${account.email}:`, data.error || response.statusText);
            }
        } catch (error) {
            console.error(`[ERROR] Login for ${account.email}:`, error.message);
        }
    }
}

testDemoLogins();
