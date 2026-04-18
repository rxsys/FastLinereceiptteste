curl -X POST https://fastlinereceipt.firebaseapp.com/api/line/webhook/fastline1 \
  -H "Content-Type: application/json" \
  -d '{"events": [{"type": "message", "replyToken": "test_token", "source": {"userId": "test_user"}, "message": {"type": "text", "text": "PING"}}]}'
