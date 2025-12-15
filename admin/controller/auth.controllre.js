// Helper function to validate email
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Helper function to validate phone
const isValidPhone = (phone) => {
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone);
};

// Helper function to identify if input is email or phone
const identifyInputType = (input) => {
    if (isValidEmail(input)) {
        return 'email';
    } else if (isValidPhone(input)) {
        return 'phone';
    }
    return 'invalid';
};

export const adminLogin = async (req, res) => {
    try {
        const { credential, password } = req.body;
        
        // Validate inputs
        if (!credential || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email/Phone and password are required'
            });
        }
        
        // Identify whether user entered email or phone
        let inputType = identifyInputType(credential);
        
        if (inputType === 'invalid') {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email or phone number'
            });
        }
        
        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }
        
        // Log the detected type
        console.log(`User entered ${inputType}: ${credential}`);
        
        // Query logic based on input type
        let query = {};
        if (inputType === 'email') {
            query = { email: credential };
        } else if (inputType === 'phone') {
            query = { phone: credential };
        }
        
        // Example response showing what was detected
        res.status(200).json({
            success: true,
            message: 'Login initiated',
            loginType: inputType,
            identifier: credential,
            // Add your database query and authentication logic here
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
}