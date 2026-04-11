# =============================================================
#  backend/compiler/lexer/tokenizer.py
#
#  WHAT CHANGED:
#  - Added Token dataclass with (type, value, line, col)
#  - tokenize() still returns same ["a -> IDENTIFIER"] strings
#    (backward compat with routes.py)
#  - tokenize_full() returns structured Token objects used
#    internally by the parser for line-accurate error messages
#  - Added support for parentheses ( )
#  - Added FLOAT number support
#  - Added IF/ELSE keyword support
# =============================================================

import re
from dataclasses import dataclass
from typing import List


# ─── Token dataclass ──────────────────────────────────────────
# Used internally by parser, TAC generator, etc.
# Not exposed to routes.py (which only needs string lists).

@dataclass
class Token:
    type:  str   # e.g. 'NUMBER', 'ID', 'OP'
    value: str   # e.g. '42', 'a', '+'
    line:  int   # 1-based line number
    col:   int   # 1-based column number

    def __repr__(self):
        return f"Token({self.type}, {self.value!r}, L{self.line}:C{self.col})"


# ─── Token specification ──────────────────────────────────────
_TOKEN_SPEC = [
    ('KEYWORD',   r'\b(int|float|char|double|if|else|while|return)\b'),
    ('FLOAT',     r'\d+\.\d+'),          # must come before NUMBER
    ('NUMBER',    r'\d+'),
    ('ID',        r'[A-Za-z_][A-Za-z0-9_]*'),
    ('OP',        r'[+\-*/=<>!]'),
    ('LPAREN',    r'\('),
    ('RPAREN',    r'\)'),
    ('LBRACE',    r'\{'),
    ('RBRACE',    r'\}'),
    ('SEPARATOR', r'[;,]'),
    ('SKIP',      r'[ \t\n\r]'),
    ('MISMATCH',  r'.'),
]

_TOK_REGEX = '|'.join(f'(?P<{name}>{pat})' for name, pat in _TOKEN_SPEC)


# ─── Display name mapping (for the string output) ─────────────
_DISPLAY = {
    'KEYWORD':   'KEYWORD',
    'FLOAT':     'FLOAT',
    'NUMBER':    'NUMBER',
    'ID':        'IDENTIFIER',
    'OP':        'OPERATOR',
    'LPAREN':    'LPAREN',
    'RPAREN':    'RPAREN',
    'LBRACE':    'LBRACE',
    'RBRACE':    'RBRACE',
    'SEPARATOR': 'SEPARATOR',
    'MISMATCH':  'INVALID',
}


def tokenize_full(code: str) -> List[Token]:
    """
    Returns structured Token objects with line and column info.
    Used internally by the parser and TAC generator.
    """
    tokens = []
    line   = 1
    line_start = 0

    for match in re.finditer(_TOK_REGEX, code):
        kind  = match.lastgroup
        value = match.group()
        col   = match.start() - line_start + 1

        if kind == 'SKIP':
            # Track newlines for accurate line counting
            if '\n' in value:
                line      += value.count('\n')
                line_start = match.end()
            continue

        tokens.append(Token(type=kind, value=value, line=line, col=col))

    return tokens


def tokenize(code: str) -> List[str]:
    """
    Returns human-readable token strings.
    Format: "value -> TYPE"
    Kept identical to original for routes.py backward compatibility.
    """
    result = []

    for tok in tokenize_full(code):
        display = _DISPLAY.get(tok.type, tok.type)
        result.append(f"{tok.value} -> {display}  [L{tok.line}:C{tok.col}]")

    return result