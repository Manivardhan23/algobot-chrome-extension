import uvicorn

if __name__ == "__main__":
    # "api:app" tells uvicorn to look in api.py for the FastAPI instance named 'app'
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)