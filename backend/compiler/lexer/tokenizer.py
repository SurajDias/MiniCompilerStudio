import re

def tokenize(code):
    tokens = []

    token_specification = [
        ('KEYWORD',  r'\b(int|float|char|double)\b'),
        ('NUMBER',   r'\d+'),
        ('ID',       r'[A-Za-z_][A-Za-z0-9_]*'),
        ('OP',       r'[+\-*/=]'),
        ('SEPARATOR', r'[;,]'),
        ('SKIP',     r'[ \t\n]'),
        ('MISMATCH', r'.'),
    ]

    tok_regex = '|'.join(f'(?P<{name}>{pattern})' for name, pattern in token_specification)

    for match in re.finditer(tok_regex, code):
        kind = match.lastgroup
        value = match.group()

        if kind == 'KEYWORD':
            tokens.append(f"{value} -> KEYWORD")
        elif kind == 'NUMBER':
            tokens.append(f"{value} -> NUMBER")
        elif kind == 'ID':
            tokens.append(f"{value} -> IDENTIFIER")
        elif kind == 'OP':
            tokens.append(f"{value} -> OPERATOR")
        elif kind == 'SEPARATOR':
            tokens.append(f"{value} -> SEPARATOR")
        elif kind == 'MISMATCH':
            tokens.append(f"{value} -> INVALID")

    return tokens