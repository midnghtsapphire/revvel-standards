# The Evaluator Agent & Skill Loading (Explained for a 10-Year-Old)

## What is an Evaluator Agent

Imagine you are baking a cake for the first time. You follow the recipe, put it in the oven, and take it out. It looks like a cake. 

But before you serve it to your friends, your older sister tastes a tiny piece. 
She says, "Wait! It's too salty. You used salt instead of sugar. Try again!"

You throw it away, read the recipe closer, use sugar this time, and bake a perfect cake. Your friends only ever see the perfect cake. They never know about the salty one.

**In AI, the "older sister" is the Evaluator Agent.**

When we build an AI (the "Worker Agent") to do a job—like sending an email or fixing a website—it might make a mistake. It might use salt instead of sugar. 

Instead of showing that mistake to the user, we have a **second AI** (the Evaluator Agent) check the work first. 

1. **The Worker Agent** does the job.
2. **The Evaluator Agent** looks at it and gives it a score from 1 to 5.
3. If the score is a 4 or 5, the user sees it! 
4. If the score is 1, 2, or 3, the Evaluator says, "Wait! You forgot to attach the file. Try again."
5. The Worker Agent tries again. 

Because of the Evaluator, the user only ever sees the perfect cake. 

---

## How to Implement the Evaluator in a New App

If you are building a new app and want to add an Evaluator, here is the exact recipe:

### Step 1: Create Two Separate AI Calls
In your code, you don't just call the AI once. You call it twice.
* **Call 1 (The Worker):** "Write a summary of this news article."
* **Call 2 (The Evaluator):** "Look at the summary the Worker just wrote. Did it include the date and the main person's name? Score it 1 to 5."

### Step 2: Set the Rules (The Rubric)
You have to tell the Evaluator exactly how to score. 
* **5:** Perfect. Everything is there.
* **4:** Good enough. Maybe a tiny spelling mistake, but it works.
* **3:** Missed something small. (Retry!)
* **2:** Missed something big. (Retry!)
* **1:** Totally wrong. (Retry!)

### Step 3: The "While Loop" (The Retry Cycle)
In your code, put the Worker Agent inside a loop. 
```javascript
let score = 0;
let attempts = 0;

while (score < 4 && attempts < 3) {
    // 1. Worker does the job
    let answer = runWorkerAgent();
    
    // 2. Evaluator checks it
    let evaluation = runEvaluatorAgent(answer);
    score = evaluation.score;
    
    // 3. If it failed, tell the Worker why so it can fix it!
    if (score < 4) {
        tellWorkerWhatWentWrong(evaluation.feedback);
    }
    attempts++;
}
```
*Note: We stop after 3 tries so the computer doesn't get stuck in a loop forever!*

---

## What is "Skill Loading

Imagine you are playing a video game. Your character is a normal person. But then, you find a glowing book on the ground. You read the book, and suddenly, your character knows how to cast a fire spell! 

You didn't have to restart the game. You just "loaded a skill."

**In AI, "Skill Loading" is exactly the same thing.**

Instead of trying to teach one AI how to do *everything in the world* (which makes it confused and slow), we keep the AI simple. When the AI needs to do a specific job—like checking the stock market or fixing a Meta Ads campaign—it goes to a special folder called `revvel-skills`.

It finds a text file (the glowing book) that tells it exactly how to do that one job. It reads the file, learns the skill instantly, does the job, and then "forgets" it when it's done so its brain doesn't get cluttered.

### How to Implement Skill Loading

1. **Create a Folder:** Make a folder in your project called `skills`.
2. **Write the Books:** Inside that folder, write text files (like `stock-analysis.md` or `meta-ads-analyzer.md`). Inside the file, write the exact instructions on how to do the job.
3. **Give the AI a Library Card:** Tell the AI, "Before you answer the user, look in the `skills` folder. If you see a file that matches what the user is asking for, read it first."

That's it! Now your AI can learn anything instantly, just by reading a file.
