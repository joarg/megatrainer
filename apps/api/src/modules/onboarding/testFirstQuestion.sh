#!/bin/bash

# Function 1: original hardcoded call
run_hardcoded() {
  curl -X POST http://localhost:3000/onboarding/initial-question \
    -H "Content-Type: application/json" \
    -d '{"sessionId": 290, "claimToken": "53e753dd-b455-4aae-8cde-4a456214d32f"}'
}

# Function 2: first calls testOnboarding.sh, extracts ids from its output
run_from_onboarding() {
  local response
  response=$(bash "$(dirname "$0")/testOnboarding.sh")

  local sessionId
  local claimToken
  sessionId=$(echo "$response" | jq -r '.sessionId')
  claimToken=$(echo "$response" | jq -r '.claimToken')

  curl -X POST http://localhost:3000/onboarding/initial-question \
    -H "Content-Type: application/json" \
    -d "{\"sessionId\": $sessionId, \"claimToken\": \"$claimToken\"}"
}

# Call whichever you need:
# run_hardcoded
run_from_onboarding