"""
Script to send 20 varied /api/predict calls to http://127.0.0.1:7861/api/predict
and verify responses.
"""
import json
import time
import urllib.request

URL = "http://127.0.0.1:7861/api/predict"

QUERIES = [
    "My SmartHome Hub keeps disconnecting from WiFi every 10 minutes with error HW-ERR-7291. Order #ORD-44210 purchased for $199.00.",
    "I was double charged $149.99 for my subscription on my credit card last night. Please reverse the duplicate charge.",
    "How do I update the shipping address on my pending order #ORD-99123? It was placed 2 hours ago.",
    "The screen on my tablet arrived cracked and shattered. I need to return it for an immediate replacement or full refund.",
    "Getting error 500 internal server error when trying to log into my account portal. Username is alex@example.com.",
    "Can you please cancel my order #ORD-10293? I ordered the wrong item by mistake.",
    "Where is my package? The tracking number TRK-99201 hasn't updated in 5 days.",
    "My battery is draining completely within 2 hours of light usage. Is this covered under the 1-year warranty?",
    "I would like to exchange my shoes for size 10. The size 9 is too tight.",
    "Charged $89.00 unauthorized transaction on invoice #INV-8831. Please investigate.",
    "Bluetooth pairing fails with error BT-FAIL-04 whenever I try connecting to iPhone 15.",
    "I haven't received my refund of $59.50 yet, even though the return package was delivered last week.",
    "Please delete my account and all associated personal data under GDPR.",
    "The firmware update failed at 85% and now the device won't turn on at all (bricked).",
    "I ordered the blue jacket but received a red sweater instead. Order #ORD-55412.",
    "Is international roaming supported on the unlimited family plan?",
    "Payment gateway timed out during checkout but money was deducted from my bank account.",
    "Can someone help me set up multi-factor authentication on my admin dashboard?",
    "Return label link in email gives 404 not found error. Need a replacement return label.",
    "Device overheating when charging with official adapter. Reaches 45C within 15 minutes."
]

def main():
    print(f"Sending {len(QUERIES)} varied requests to {URL}...")
    success = 0
    for i, q in enumerate(QUERIES, 1):
        payload = json.dumps({"text": q}).encode("utf-8")
        req = urllib.request.Request(
            URL,
            data=payload,
            headers={"Content-Type": "application/json"}
        )
        t0 = time.time()
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                dt = (time.time() - t0) * 1000
                print(f"[{i:2d}/20] ({dt:5.1f}ms) Cat: {data.get('category')} | Urg: {data.get('urgency')} | Sim: {len(data.get('similar_tickets', []))} matches")
                success += 1
        except Exception as e:
            print(f"[{i:2d}/20] FAILED: {e}")
    print(f"\nCompleted: {success}/{len(QUERIES)} successful requests.")

if __name__ == "__main__":
    main()
