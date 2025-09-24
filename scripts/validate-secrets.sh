#!/bin/bash
# Script to validate GitHub Secrets for safe deployment

echo "🔍 Validating GitHub Secrets for deployment safety..."

# Function to check for dangerous characters
check_secret_safety() {
    local secret_name=$1
    local secret_value=$2

    # Characters that cause bash syntax errors
    local dangerous_chars='$()[]{}"`\|&;*?<>!'

    echo "Checking $secret_name..."

    # Check if secret contains dangerous characters
    if [[ "$secret_value" =~ [\$\(\)\[\]\{\}\"\`\\|&\;\*\?\<\>\!] ]]; then
        echo "❌ $secret_name contains dangerous characters!"
        echo "   Problematic characters found in: $secret_value"
        echo "   Use only: A-Z a-z 0-9 - _ ."
        return 1
    else
        echo "✅ $secret_name is safe"
        return 0
    fi
}

# Check length requirements
check_secret_length() {
    local secret_name=$1
    local secret_value=$2
    local min_length=$3

    if [ ${#secret_value} -lt $min_length ]; then
        echo "❌ $secret_name is too short (${#secret_value} chars, minimum $min_length)"
        return 1
    else
        echo "✅ $secret_name length is adequate (${#secret_value} chars)"
        return 0
    fi
}

# Simulate the secrets (replace with actual values for testing)
MONGO_ROOT_PASSWORD="${MONGO_ROOT_PASSWORD:-test-password-123}"
JWT_SECRET="${JWT_SECRET:-test-jwt-secret-key-123}"
REDIS_PASSWORD="${REDIS_PASSWORD:-test-redis-pass-123}"

echo "=================================="
echo "🧪 SECRET VALIDATION REPORT"
echo "=================================="

all_valid=true

# Validate MONGO_ROOT_PASSWORD
if ! check_secret_safety "MONGO_ROOT_PASSWORD" "$MONGO_ROOT_PASSWORD"; then
    all_valid=false
fi
if ! check_secret_length "MONGO_ROOT_PASSWORD" "$MONGO_ROOT_PASSWORD" 16; then
    all_valid=false
fi

echo ""

# Validate JWT_SECRET
if ! check_secret_safety "JWT_SECRET" "$JWT_SECRET"; then
    all_valid=false
fi
if ! check_secret_length "JWT_SECRET" "$JWT_SECRET" 32; then
    all_valid=false
fi

echo ""

# Validate REDIS_PASSWORD
if ! check_secret_safety "REDIS_PASSWORD" "$REDIS_PASSWORD"; then
    all_valid=false
fi
if ! check_secret_length "REDIS_PASSWORD" "$REDIS_PASSWORD" 12; then
    all_valid=false
fi

echo ""
echo "=================================="

if $all_valid; then
    echo "🎉 All secrets are valid and safe!"
    echo "✅ Ready for deployment"
    exit 0
else
    echo "❌ Some secrets have issues"
    echo ""
    echo "🔧 RECOMMENDED SAFE VALUES:"
    echo "MONGO_ROOT_PASSWORD=ExcalidrawMongo2024SecurePass123456789"
    echo "JWT_SECRET=ExcalidrawJWT2024ITICASecretKeyWithNumbers987654321"
    echo "REDIS_PASSWORD=ExcalidrawRedis2024CachePass123456789"
    echo ""
    echo "📝 Update your GitHub Secrets with safe values and try again"
    exit 1
fi