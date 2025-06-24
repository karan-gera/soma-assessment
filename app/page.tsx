"use client"
import { Todo } from '@prisma/client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [newTodo, setNewTodo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loadingTodos, setLoadingTodos] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const res = await fetch('/api/todos');
      const data = await res.json();
      setTodos(data);
    } catch (error) {
      console.error('Failed to fetch todos:', error);
    }
  };

  const handleAddTodo = async () => {
    if (!newTodo.trim()) return;
    
    const tempId = Date.now();
    setLoadingTodos(prev => new Set(prev).add(tempId));
    
    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: newTodo,
          dueDate: dueDate || null 
        }),
      });
      
      if (response.ok) {
        setNewTodo('');
        setDueDate('');
        fetchTodos();
      }
    } catch (error) {
      console.error('Failed to add todo:', error);
    } finally {
      setLoadingTodos(prev => {
        const newSet = new Set(prev);
        newSet.delete(tempId);
        return newSet;
      });
    }
  };

  const handleDeleteTodo = async (id: number) => {
    try {
      await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
      });
      fetchTodos();
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 to-red-500 flex flex-col items-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-center text-white mb-8">Things To Do App</h1>
        <div className="flex mb-6">
          <input
            type="text"
            className="flex-grow p-3 rounded-l-full focus:outline-none text-gray-700"
            placeholder="Add a new todo"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
          />
          <input 
            type="date" 
            className="p-3 border-l border-gray-300 focus:outline-none text-gray-700"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <button
            onClick={handleAddTodo}
            className="bg-white text-indigo-600 p-3 rounded-r-full hover:bg-gray-100 transition duration-300"
          >
            Add
          </button>
        </div>
        <ul>
          {todos.map((todo: Todo) => (
            <li
              key={todo.id}
              className="flex justify-between items-start bg-white bg-opacity-90 p-4 mb-4 rounded-lg shadow-lg"
            >
              <div className="flex flex-col flex-grow mr-4">
                <span className="text-gray-800 font-medium">{todo.title}</span>
                {todo.dueDate && (
                  <span className={`text-sm mt-1 ${
                    isOverdue(todo.dueDate.toString()) ? 'text-red-600 font-semibold' : 'text-gray-600'
                  }`}>
                    Due: {formatDate(todo.dueDate.toString())}
                    {isOverdue(todo.dueDate.toString()) && ' (Overdue)'}
                  </span>
                )}
                {todo.imageUrl && (
                  <div className="mt-3">
                    <img 
                      src={todo.imageUrl} 
                      alt={`Visual for: ${todo.title}`}
                      className="w-full h-32 object-cover rounded-lg shadow-sm"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                {loadingTodos.has(todo.id) && (
                  <div className="mt-3 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading image...</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDeleteTodo(todo.id)}
                className="text-red-500 hover:text-red-700 transition duration-300 flex-shrink-0"
              >
                {/* Delete Icon */}
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
