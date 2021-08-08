module.exports = {
    "ignorePatterns": ["gulpfile.js"],
    "env": {
        "es2021": true,
        "node": true,
        "mocha": true
    },
    "extends": [
        "standard"
    ],
    "parserOptions": {
        "ecmaVersion": 12
    },
    "rules": {
        "indent": ["warn", 4, { "SwitchCase": 1 }],
        "quotes": [
            "error",
            "double",
            {
                "avoidEscape": true,
                "allowTemplateLiterals": true
            }
        ],
        "no-var": ["error"],
        "quote-props": ["error", "always"],
        "semi": [
            "error",
            "always"
        ],
        "curly": ["warn", "multi-or-nest"],
        "space-before-function-paren": ["warn", "always"],
        "no-unused-vars": "warn",
        "node/no-callback-literal": "off"
    }
};
