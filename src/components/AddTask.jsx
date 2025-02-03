import { useState } from "react";

export default function AddTask({ addTask }) {
  const [text, setText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    addTask(text);
    setText("");
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" placeholder="Add a task..." value={text} onChange={(e) => setText(e.target.value)} />
      <button type="submit">+</button>
    </form>
  );
}
