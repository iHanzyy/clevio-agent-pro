import requests
import os
from dotenv import load_dotenv

# Load from separate debug env file
load_dotenv('.env.debug')

# Load tokens from environment variables
login_token = os.getenv("DEBUG_LOGIN_TOKEN", "")
api_key_token = os.getenv("DEBUG_API_KEY_TOKEN", "")

if not login_token or not api_key_token:
    print("Error: Please set DEBUG_LOGIN_TOKEN and DEBUG_API_KEY_TOKEN in .env.debug file")
    exit(1)

print("Testing with login JWT:")
response = requests.get(
    "http://localhost:8000/api/v1/agents/",
    headers={"Authorization": f"Bearer {login_token}"}
)
print(f"Status: {response.status_code}")
print(f"Response: {response.text}")
print()

print("Testing with API key:")
response = requests.get(
    "http://localhost:8000/api/v1/agents/",
    headers={"Authorization": f"Bearer {api_key_token}"}
)
print(f"Status: {response.status_code}")
print(f"Response: {response.text}")
