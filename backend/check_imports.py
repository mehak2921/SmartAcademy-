import os
import ast
import sys
import importlib.util

def get_imports(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        try:
            tree = ast.parse(f.read())
        except Exception:
            return set()
    imports = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.add(alias.name.split('.')[0])
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                imports.add(node.module.split('.')[0])
    return imports

missing = set()
for root, _, files in os.walk('.'):
    if '.venv' in root or 'venv' in root or '__pycache__' in root:
        continue
    for file in files:
        if file.endswith('.py'):
            filepath = os.path.join(root, file)
            for imp in get_imports(filepath):
                if imp in sys.builtin_module_names:
                    continue
                try:
                    if not importlib.util.find_spec(imp):
                        missing.add(imp)
                except Exception:
                    pass

print("MISSING:", ','.join(missing))
