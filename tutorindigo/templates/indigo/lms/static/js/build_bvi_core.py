#!/usr/bin/env python3
import pathlib
import subprocess
import sys

root = pathlib.Path(__file__).resolve().parent
vendor = root / 'vendor' / 'bvi.min.js'
out = root / 'bvi-core.js'
content = vendor.read_text(encoding='utf-8')
marker = '}(this,(function(){'
idx = content.find(marker)
if idx == -1:
    sys.exit('marker not found')
start = idx + len(marker)
end = content.rfind('}}));')
if end == -1:
    sys.exit('end not found')
factory_inner = content[start:end + 1]
# location.host includes the port (e.g. :8000), which is invalid for Cookie domain=
factory_inner = factory_inner.replace(',";domain=").concat(location.host)', ')')
factory_inner = factory_inner.replace(';domain=").concat(location.host)', '")')
wrapped = (
    '(function (root) {\n'
    '    root.isvek = (function () {\n'
    + factory_inner
    + '\n    })();\n'
    '}(typeof globalThis !== "undefined" ? globalThis : window));\n'
)
out.write_text(wrapped, encoding='utf-8', newline='\n')
print('written', len(wrapped), 'bytes to', out)
