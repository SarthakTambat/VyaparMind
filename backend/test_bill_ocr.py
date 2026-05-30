# -*- coding: utf-8 -*-
"""Test bill parser with the actual OCR output from user's bill image"""
import sys
sys.path.insert(0, '.')
from server import _parse_bill_text

# Exact OCR output from Windows OCR on user's bill (C:\...\image.png)
ocr_text = """Sr.no
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
Name of items
Aer Godrej Pocket
Air Freshner 300 MI spray
Room Freshener Godre\u2022
Arom Oil Citrus 1 Ltr
Ambi Pur Air Freshener Spray
Air Purifier Dispenser
HCL Acid 5 Ltr
Ala Bleach 500ML
- 275 mi
Automatic Room Fresheners Godrej Matic Refill 225 ml
Check Duster Cloth Blue -2 & Red -2
Castic Soda
Chock Pump
Cotteon Hand Gloves
Dettol Liquid Soap 900 ml
Dettol Liquid Soap 5 Ltr
Drainex Cleaner 50 Gm
Dry Mop Refill Blue 24"
Feather Brush Bi
Feather Brush Medium
Garba eBa Bio De radable Bi 40x50
Garbage Bag Bio Degradable Big 29x39
Garba eBa Bio De radable Small 19x21
HSN Code
33074900
33074900
33074900
33074900
33074900
8421
28061000
34022020
33074900
63071010
84137091
61160010
34013090
34013090
34029091
96039000
96039000
96039000
39232100
39232100
39232100
QTY
1
1
1
1
1
1
1
1
1
1
1
1
1
1
1
1
1
1
1
1
1
1
UOM
Nos
Nos
Nos
Bottle
Nos
Nos
Nos
Nos
Nos
Nos
Nos
Nos
Nos
Bottle
Can
Nos
Nos
Nos
Nos
Nos
Nos
Nos
GST
Rate
18%
18%
18%
5%
18%
18%
18%
18%
18%
Rate
52.00
72.00
140.00
1050.00
225.00
1200.00
350.00
85.00
280.00
15.00
110.00
45.00
32.00
145.00
750.00
25.00
325.00
90.00
55.00
115.00
65.00
45.00"""

items = _parse_bill_text(ocr_text)
print(f"Found {len(items)} items:")
total = 0
for i, item in enumerate(items, 1):
    print(f"  {i}. {item['name']} - Qty: {item['quantity']}, Unit: {item['unit']}, Price: Rs.{item['price']:.2f}")
    total += item['price'] * item['quantity']
print(f"\nTotal: Rs.{total:.2f}")
