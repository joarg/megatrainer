curl -X POST http://localhost:3000/trainers/ \
      -H "Content-Type: application/json" \
      -d '{"name": "joey", "personality": "friendly", "slug": "joey", "sports": ["basketball", "soccer"]}'