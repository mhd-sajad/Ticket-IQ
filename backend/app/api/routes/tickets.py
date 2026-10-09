"""
Sample tickets route for UI demonstrations.
"""
from fastapi import APIRouter

router = APIRouter(tags=["tickets"])


@router.get("/api/tickets/sample")
def get_sample_tickets():
    return [
        {
            "id": "SMP-001",
            "text": "I placed order #ORD-29481 on Sept 15 for a MacBook Pro 16\" ($2,499.00) and it still shows 'processing' after 3 weeks. I've contacted support twice already with no resolution. Error code E-4012 appeared when I tried to track the shipment.",
            "category": "Customer Service",
            "urgency": "High",
        },
        {
            "id": "SMP-002",
            "text": "Hi, I can't log into my account since yesterday. I keep getting error ERR_AUTH_503 when I enter my password. I've tried resetting my password 3 times but the reset email never arrives.",
            "category": "Technical",
            "urgency": "High",
        },
        {
            "id": "SMP-003",
            "text": "I was charged $149.99 twice for order #ORD-38712 placed on Oct 2. My bank statement shows two identical transactions. I'd like a refund for the duplicate charge.",
            "category": "Billing and Payments",
            "urgency": "Critical",
        },
        {
            "id": "SMP-004",
            "text": "The SmartHome Hub Pro I received is defective — it keeps disconnecting from WiFi every 10–15 minutes and shows error code HW-ERR-7291. Order #ORD-44210 purchased on Aug 28 for $199.00. I want a replacement or full refund.",
            "category": "Technical",
            "urgency": "Medium",
        },
        {
            "id": "SMP-005",
            "text": "I need to return the item from order #ORD-88120. The jacket is the wrong size and I would like to exchange it for a Large or get a store credit refund.",
            "category": "Returns and Exchanges",
            "urgency": "Low",
        },
    ]
