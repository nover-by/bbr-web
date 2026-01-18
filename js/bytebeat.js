export class BytebeatEngine {
    constructor() {
        this.t = 0;
        this.expression = '1<<(t%8)';
        this.compiledFunction = null;
        this.compile(this.expression);
    }

    compile(expression) {
        this.expression = expression;
        try {
            // Create a safe evaluation function
            // Only allow basic math operations and the variable 't'
            const sanitized = this.sanitizeExpression(expression);
            this.compiledFunction = new Function('t', `return (${sanitized}) & 255;`);
            return { success: true };
        } catch (error) {
            console.error('Compilation error:', error);
            this.compiledFunction = null;
            return { success: false, error: error.message };
        }
    }

    sanitizeExpression(expr) {
        // Allow only safe characters for bytebeat expressions
        // Numbers, operators, parentheses, and 't'
        const allowed = /^[t0-9\s\+\-\*\/\%\&\|\^\~\<\>\(\)]+$/;
        
        if (!allowed.test(expr)) {
            throw new Error('Invalid characters in expression');
        }
        
        return expr;
    }

    evaluate() {
        if (!this.compiledFunction) {
            return 0;
        }
        
        try {
            const value = this.compiledFunction(this.t);
            return Math.floor(value) & 255; // Ensure 8-bit value
        } catch (error) {
            console.error('Evaluation error:', error);
            return 0;
        }
    }

    step() {
        const value = this.evaluate();
        this.t++;
        return value;
    }

    reset() {
        this.t = 0;
    }

    getTime() {
        return this.t;
    }

    getBits(value) {
        const bits = [];
        for (let i = 7; i >= 0; i--) {
            bits.push((value >> i) & 1);
        }
        return bits;
    }
}