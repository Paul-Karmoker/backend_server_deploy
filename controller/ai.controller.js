import aiModel from "../model/ai.model.js"; // Import the aiModel using ES Modules

export const getResponse = async (req, res) => {
    console.log('/ai/get-review', req.body.prompt); // Log the request body
    const { prompt } = req.body; // Destructure the prompt from the request body
    if (!prompt) {
        return res.status(400).json({ error: "Prompt is Required" });
    }

    try {
        const response = await aiModel(prompt); // Call the aiModel function
        res.json({ message: response }); // Send the response back to the client
    } catch (error) {
        console.error("Error in getResponse:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};