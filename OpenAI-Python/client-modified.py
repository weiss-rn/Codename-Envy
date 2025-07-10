from openai import OpenAI

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key="<API-Keys>",
)
def chat_completion():
    completion = client.chat.completions.create(
    extra_body={},
    model="<replace_with_models>",
    messages=[
        {
        "role": "user",
        "content": input("Enter your message: ")
        }
    ]
    )
    print(completion.choices[0].message.content)

if __name__ == "__main__":
    chat_completion()
