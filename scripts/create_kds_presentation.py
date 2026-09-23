from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.util import Inches, Pt
from pathlib import Path

OUT = 'PREVA_KDS_How_It_Works.pptx'
LIVE_SCREEN = 'real-kds-live-display.png'
TAKE_ORDER_SCREEN = 'real-kds-take-order.png'
prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

NAVY = RGBColor(15, 13, 11)
PANEL = RGBColor(28, 24, 20)
PANEL2 = RGBColor(43, 35, 27)
TEAL = RGBColor(201, 169, 110)
CYAN = RGBColor(221, 191, 128)
WHITE = RGBColor(244, 240, 230)
MUTED = RGBColor(151, 143, 130)
AMBER = RGBColor(240, 208, 128)
RED = RGBColor(201, 91, 80)
GREEN = RGBColor(107, 174, 125)

def box(slide, x, y, w, h, fill, radius=False, line=None):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    shape.fill.solid(); shape.fill.fore_color.rgb = fill
    shape.line.color.rgb = line or fill
    if radius:
        shape.adjustments[0] = 0.12
    return shape

def text(slide, value, x, y, w, h, size=18, color=WHITE, bold=False, align=PP_ALIGN.LEFT):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame; tf.clear(); tf.word_wrap = True; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]; p.alignment = align
    r = p.add_run(); r.text = value; r.font.name = 'Aptos'; r.font.size = Pt(size); r.font.bold = bold; r.font.color.rgb = color
    return tb

def base(title, kicker=None):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg = slide.background.fill; bg.solid(); bg.fore_color.rgb = NAVY
    box(slide, 0, 0, 13.333, 0.12, TEAL)
    if kicker: text(slide, kicker.upper(), 0.65, 0.45, 4, 0.25, 9, TEAL, True)
    text(slide, title, 0.65, 0.72, 12, 0.55, 27, WHITE, True)
    text(slide, 'PREVA KITCHEN  /  OPERATIONS', 10.1, 0.5, 2.55, 0.25, 8, MUTED, True, PP_ALIGN.RIGHT)
    return slide

def pill(slide, label, x, y, w, color=TEAL):
    box(slide, x, y, w, 0.34, color, True)
    text(slide, label, x, y + 0.01, w, 0.28, 9, NAVY, True, PP_ALIGN.CENTER)

# 1 Cover
slide = prs.slides.add_slide(prs.slide_layouts[6]); slide.background.fill.solid(); slide.background.fill.fore_color.rgb = NAVY
box(slide, 0, 0, 13.333, 0.14, TEAL)
text(slide, 'KITCHEN DISPLAY SYSTEM (KDS)', 0.75, 0.85, 7.2, 0.65, 29, WHITE, True)
text(slide, 'How It Works', 0.78, 1.55, 5.5, 0.55, 24, TEAL, True)
text(slide, 'A clear path from incoming order to kitchen handoff.', 0.8, 2.25, 5.4, 0.5, 14, MUTED)
box(slide, 7.05, 0.8, 5.35, 5.65, PANEL, True, PANEL2)
box(slide, 7.42, 1.18, 4.62, 0.5, PANEL2, True)
text(slide, 'PREVA KITCHEN', 7.7, 1.28, 2.3, 0.22, 10, TEAL, True)
text(slide, 'KDS LOGIN', 7.42, 2.0, 4.62, 0.35, 19, WHITE, True, PP_ALIGN.CENTER)
text(slide, 'User ID', 7.85, 2.72, 3.8, 0.22, 10, MUTED, True)
box(slide, 7.82, 2.98, 3.82, 0.48, NAVY, True, PANEL2); text(slide, 'chef', 8.05, 3.06, 3.3, 0.22, 12, WHITE)
text(slide, 'Password', 7.85, 3.72, 3.8, 0.22, 10, MUTED, True)
box(slide, 7.82, 3.98, 3.82, 0.48, NAVY, True, PANEL2); text(slide, '************', 8.05, 4.06, 3.3, 0.22, 12, MUTED)
box(slide, 7.82, 4.8, 3.82, 0.53, TEAL, True); text(slide, 'LOGIN', 7.82, 4.91, 3.82, 0.22, 11, NAVY, True, PP_ALIGN.CENTER)
text(slide, 'SECURE KITCHEN TERMINAL', 7.82, 5.75, 3.82, 0.2, 8, MUTED, True, PP_ALIGN.CENTER)
if Path(LIVE_SCREEN).exists():
    slide.shapes.add_picture(LIVE_SCREEN, Inches(7.12), Inches(4.35), width=Inches(5.2), height=Inches(1.52))
    text(slide, 'Actual Preva Kitchen Live Display screenshot', 7.12, 5.94, 5.2, 0.2, 8, MUTED, False, PP_ALIGN.CENTER)

# 2 Definition
slide = base('What is a Kitchen Display System?', '01  /  Overview')
box(slide, 0.75, 1.75, 5.05, 4.55, PANEL, True)
text(slide, 'KDS', 1.15, 2.25, 1.5, 0.65, 38, TEAL, True)
text(slide, 'A digital screen that replaces paper order tickets in a restaurant kitchen.', 1.15, 3.05, 4.1, 1.0, 22, WHITE, True)
text(slide, 'Orders arrive in real time, stay visible through every kitchen stage, and give the team one shared source of truth.', 1.15, 4.35, 3.9, 0.9, 13, MUTED)
box(slide, 6.35, 1.75, 5.9, 4.55, PANEL, True)
for i, (label, color) in enumerate([('INCOMING', CYAN), ('PREPARING', AMBER), ('READY', GREEN)]):
    y = 2.2 + i * 1.15
    box(slide, 6.8, y, 4.95, 0.72, PANEL2, True)
    box(slide, 7.02, y + 0.18, 0.3, 0.3, color, True)
    text(slide, label, 7.55, y + 0.12, 2.0, 0.25, 12, WHITE, True)
    text(slide, 'Live kitchen visibility', 9.25, y + 0.12, 2.1, 0.25, 10, MUTED, False, PP_ALIGN.RIGHT)
if Path(TAKE_ORDER_SCREEN).exists():
    box(slide, 6.55, 1.95, 5.5, 3.55, NAVY, True, TEAL)
    slide.shapes.add_picture(TAKE_ORDER_SCREEN, Inches(6.62), Inches(2.02), width=Inches(5.36), height=Inches(3.17))
    text(slide, 'Actual Preva Kitchen Take Order screen', 6.62, 5.32, 5.36, 0.2, 8, MUTED, False, PP_ALIGN.CENTER)

# 3 Flow
slide = base('How It Works — Order Flow', '02  /  Flow')
steps = [('1', 'Customer', 'places order'), ('2', 'Checkout', 'validates payment'), ('3', 'KDS', 'alerts the kitchen'), ('4', 'Kitchen', 'prepares food'), ('5', 'Complete', 'handoff confirmed')]
for i, (num, head, sub) in enumerate(steps):
    x = 0.7 + i * 2.52
    box(slide, x, 2.15, 1.85, 2.1, PANEL, True)
    box(slide, x + 0.63, 1.72, 0.6, 0.6, TEAL if i < 3 else GREEN, True)
    text(slide, num, x + 0.63, 1.85, 0.6, 0.2, 16, NAVY, True, PP_ALIGN.CENTER)
    text(slide, head, x + 0.15, 2.55, 1.55, 0.3, 15, WHITE, True, PP_ALIGN.CENTER)
    text(slide, sub, x + 0.15, 3.05, 1.55, 0.35, 10, MUTED, False, PP_ALIGN.CENTER)
    if i < 4:
        text(slide, '>', x + 1.95, 2.9, 0.45, 0.35, 24, TEAL, True, PP_ALIGN.CENTER)
text(slide, 'Every status change is timestamped, visible, and shared across the kitchen.', 2.1, 5.35, 9.1, 0.45, 16, MUTED, False, PP_ALIGN.CENTER)

# 4 Mockup
slide = base('KDS Screen — One View of Service', '03  /  Live board')
box(slide, 0.45, 1.45, 12.45, 5.55, PANEL, True)
box(slide, 0.7, 1.7, 2.15, 5.05, RGBColor(20, 17, 14), True)
text(slide, 'P  Preva Kitchen', 0.92, 1.98, 1.75, 0.25, 12, WHITE, True)
for idx, label in enumerate(['Live Display', 'Take Order', 'Table Status', 'KDS Orders', 'KDS Settings']):
    y = 2.55 + idx * 0.55
    if idx == 0: box(slide, 0.78, y - 0.04, 1.9, 0.42, RGBColor(54, 43, 30), True)
    text(slide, label, 0.98, y, 1.5, 0.18, 9, TEAL if idx == 0 else MUTED, idx == 0)
box(slide, 3.05, 1.7, 9.35, 0.55, PANEL2, True)
text(slide, 'KDS LIVE DISPLAY', 3.3, 1.87, 3.2, 0.2, 11, TEAL, True)
pill(slide, 'WAITING  04', 9.45, 1.8, 1.25, AMBER); pill(slide, 'READY  02', 10.85, 1.8, 1.25, GREEN)
cards = [('#1042', 'Table 4', '2x Wings  /  1x Fries', 'NEW', AMBER, '02:14'), ('#1043', 'Delivery', '1x Salmon  /  2x Sides', 'IN PROGRESS', CYAN, '08:32'), ('#1044', 'Pickup', '3x Pasta  /  1x Salad', 'READY', GREEN, '14:05')]
for i, (num, table, items, status, color, timer) in enumerate(cards):
    x = 3.15 + i * 3.05
    box(slide, x, 2.65, 2.75, 3.55, PANEL2, True, color)
    text(slide, num, x + 0.22, 3.08, 1.0, 0.3, 18, WHITE, True)
    text(slide, table, x + 1.0, 3.12, 1.45, 0.2, 9, MUTED, True, PP_ALIGN.RIGHT)
    box(slide, x + 0.22, 3.65, 2.3, 0.55, NAVY, True)
    text(slide, items, x + 0.35, 3.82, 2.05, 0.2, 9, WHITE, True)
    text(slide, 'ORDER TIMER', x + 0.22, 4.55, 1.3, 0.2, 8, MUTED, True)
    text(slide, timer, x + 1.48, 4.48, 0.95, 0.35, 15, color, True, PP_ALIGN.RIGHT)
    pill(slide, status, x + 0.22, 5.25, 1.35, color)
    text(slide, 'Station / Expo', x + 1.3, 5.31, 1.2, 0.18, 8, MUTED, False, PP_ALIGN.RIGHT)
    if Path(LIVE_SCREEN).exists():
        box(slide, 0.72, 1.55, 11.9, 3.75, NAVY, True, TEAL)
        slide.shapes.add_picture(LIVE_SCREEN, Inches(0.8), Inches(1.63), width=Inches(11.74), height=Inches(3.44))
        text(slide, 'Actual running Preva KDS Live Display — full captured screen from top navigation to status area.', 0.8, 5.43, 11.74, 0.28, 11, MUTED, False, PP_ALIGN.CENTER)

# 5 Features
slide = base('Key Features', '04  /  Control')
features = [('SYNC', 'Real-time order sync', TEAL), ('PRIORITY', 'Color-coded order priority', AMBER), ('TIMER', 'Order timers and SLA warnings', CYAN), ('ROUTE', 'Multi-station routing', GREEN), ('LOG', 'Order history and audit log', RGBColor(177, 130, 239))]
for i, (icon, label, color) in enumerate(features):
    x = 0.8 + (i % 3) * 4.1; y = 1.8 + (i // 3) * 2.05
    box(slide, x, y, 3.65, 1.45, PANEL, True)
    box(slide, x + 0.25, y + 0.35, 0.75, 0.75, color, True)
    text(slide, icon, x + 0.25, y + 0.58, 0.75, 0.18, 8, NAVY, True, PP_ALIGN.CENTER)
    text(slide, label, x + 1.25, y + 0.48, 2.1, 0.4, 14, WHITE, True)
    text(slide, 'Built for a busy service line', x + 1.25, y + 0.93, 2.1, 0.2, 9, MUTED)

# 6 Benefits
slide = base('Benefits', '05  /  Outcome')
text(slide, 'A calmer kitchen starts with shared visibility.', 0.8, 1.65, 11.2, 0.45, 18, MUTED)
benefits = [('01', 'Faster service', 'Less time searching for tickets.', TEAL), ('02', 'Fewer errors', 'Clear items, options, notes, and status.', CYAN), ('03', 'Paperless kitchen', 'One live board replaces scattered slips.', GREEN), ('04', 'Better coordination', 'Every station sees the same truth.', AMBER)]
for i, (num, head, sub, color) in enumerate(benefits):
    x = 0.8 + (i % 2) * 6.05; y = 2.5 + (i // 2) * 1.7
    box(slide, x, y, 5.45, 1.25, PANEL, True)
    text(slide, num, x + 0.25, y + 0.25, 0.55, 0.35, 16, color, True)
    text(slide, head, x + 1.0, y + 0.2, 3.9, 0.3, 16, WHITE, True)
    text(slide, sub, x + 1.0, y + 0.65, 3.9, 0.25, 10, MUTED)
text(slide, 'FROM ORDER  →  TO EXPO  →  TO A BETTER SERVICE', 2.25, 6.55, 8.8, 0.25, 11, TEAL, True, PP_ALIGN.CENTER)

prs.save(OUT)
print(OUT)