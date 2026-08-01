import py_compile
import glob
import os

print("--- COMPILING ALL BACKEND PYTHON MODULES ---")
py_files = glob.glob("app/**/*.py", recursive=True) + glob.glob("*.py")
errors = []

for f in py_files:
    try:
        py_compile.compile(f, doraise=True)
        print(f"✅ {f}")
    except Exception as e:
        print(f"❌ {f}: {e}")
        errors.append((f, e))

if not errors:
    print("\n🎉 ALL BACKEND MODULES COMPILED WITH ZERO SYNTAX ERRORS!")
else:
    print(f"\n⚠️ {len(errors)} ERRORS FOUND!")
