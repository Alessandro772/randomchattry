from flask import Flask, request, jsonify
import opennsfw2 as n2
import os

app = Flask(__name__)

# Route for checking NSFW images
@app.route('/check_nsfw', methods=['POST'])
def check_nsfw():
    if 'image' not in request.files:
        return jsonify({"error": "No image part"}), 400
    image_file = request.files['image']
    if image_file.filename == '':
        return jsonify({"error": "No selected image"}), 400
    temp_path = os.path.join('temp', image_file.filename)
    image_file.save(temp_path)
    check = round(n2.predict_image(temp_path))
    os.remove(temp_path)
    result = 1 if check > 0 else 0
    return jsonify({"nsfw": result})

# Run the Flask application
if __name__ == '__main__':
    # Creare la cartella 'temp' se non esiste
    if not os.path.exists('temp'):
        os.makedirs('temp')

    # Utilizza la porta assegnata da Render tramite la variabile d'ambiente `PORT`
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
