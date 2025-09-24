# 🚨 URGENT: Fix GitHub Secrets

## ❌ Current Problem
Your deployment is failing because one of your GitHub Secrets contains **special characters** that break bash syntax.

The error `syntax error near unexpected token '('` means there's a `(` or similar character in one of your passwords.

## 🔍 Which Secret is Broken?
Based on the error location, it's likely the **REDIS_PASSWORD** contains problematic characters.

## ✅ IMMEDIATE FIX

**Go to GitHub → Settings → Secrets and variables → Actions**

Replace your secrets with these **SAFE** values (copy exactly):

```
MONGO_ROOT_PASSWORD
ExcalidrawMongo2024SecurePass123456789

JWT_SECRET
ExcalidrawJWT2024ITICASecretKeyWithNumbers987654321

REDIS_PASSWORD
ExcalidrawRedis2024CachePass123456789
```

## ❌ NEVER Use These Characters in Secrets:
- `$` `(` `)` `[` `]` `{` `}`
- `"` `'` `` ` `` `\` `|` `&` `;`
- `*` `?` `<` `>` `!` `@` `#`

## ✅ ONLY Use These Safe Characters:
- Letters: `A-Z` `a-z`
- Numbers: `0-9`
- Dashes: `-` `_`
- Dots: `.`

## 🚀 After Fixing Secrets:

1. **Update the secrets** with safe values above
2. **Push any small change** to trigger new deployment:
   ```bash
   git commit --allow-empty -m "trigger deploy with fixed secrets"
   git push origin master
   ```
3. **Watch Actions** tab for successful deployment

## 🧪 Test Your Secrets

Run this to validate your passwords locally:
```bash
bash scripts/validate-secrets.sh
```

---

**The deployment will work immediately once you use safe passwords!** 🎉