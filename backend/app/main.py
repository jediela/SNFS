from app import create_app

app = create_app()


@app.route("/", methods=["GET"])
def home():
    return "APP IS RUNNING"


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8000)
