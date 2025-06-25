"use client"
import { Todo } from '@prisma/client';
import { useState, useEffect } from 'react';

interface TodoWithDependencies extends Todo {
  dependencies?: Array<{
    required: {
      id: number;
      title: string;
      dueDate: Date | null;
      estimatedDuration: number | null;
    };
  }>;
  estimatedDuration?: number | null;
  earliestStartDate?: Date | null;
}

export default function Home() {
  const [newTodo, setNewTodo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [todos, setTodos] = useState<TodoWithDependencies[]>([]);
  const [loadingTodos, setLoadingTodos] = useState<Set<number>>(new Set());
  const [selectedTodo, setSelectedTodo] = useState<number | null>(null);
  const [criticalPath, setCriticalPath] = useState<TodoWithDependencies[]>([]);
  const [showDependencyModal, setShowDependencyModal] = useState(false);

  useEffect(() => {
    fetchTodos();
    fetchCriticalPath();
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

  const fetchCriticalPath = async () => {
    try {
      const res = await fetch('/api/critical-path');
      const data = await res.json();
      setCriticalPath(data.criticalPath || []);
    } catch (error) {
      console.error('Failed to fetch critical path:', error);
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
          dueDate: dueDate || null,
          estimatedDuration: estimatedDuration || null
        }),
      });
      
      if (response.ok) {
        setNewTodo('');
        setDueDate('');
        setEstimatedDuration('');
        fetchTodos();
        fetchCriticalPath();
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
      fetchCriticalPath();
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  const handleAddDependency = async (dependentId: number, requiredId: number) => {
    try {
      const response = await fetch(`/api/todos/${dependentId}/dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requiredId }),
      });
      
      if (response.ok) {
        fetchTodos();
        fetchCriticalPath();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add dependency');
      }
    } catch (error) {
      console.error('Failed to add dependency:', error);
    }
  };

  const handleRemoveDependency = async (dependentId: number, requiredId: number) => {
    try {
      const response = await fetch(`/api/todos/${dependentId}/dependencies?requiredId=${requiredId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        fetchTodos();
        fetchCriticalPath();
      }
    } catch (error) {
      console.error('Failed to remove dependency:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const isInCriticalPath = (todoId: number) => {
    return criticalPath.some(todo => todo.id === todoId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 to-red-500 flex flex-col items-center p-4">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl font-bold text-center text-white mb-8">Things To Do App</h1>
        
        {/* Add Todo Form */}
        <div className="bg-white bg-opacity-90 p-6 rounded-lg shadow-lg mb-6">
          <div className="flex flex-wrap gap-2 mb-4">
            <input
              type="text"
              className="flex-grow p-3 rounded-full focus:outline-none text-gray-700 border"
              placeholder="Add a new todo"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
            />
            <input 
              type="date" 
              className="p-3 rounded-full focus:outline-none text-gray-700 border"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <input
              type="number"
              className="w-24 p-3 rounded-full focus:outline-none text-gray-700 border"
              placeholder="Min"
              value={estimatedDuration}
              onChange={(e) => setEstimatedDuration(e.target.value)}
            />
            <button
              onClick={handleAddTodo}
              className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 transition duration-300"
            >
              Add
            </button>
          </div>
          <div className="text-sm text-gray-600">
            <span className="mr-4">📅 Due Date (optional)</span>
            <span>⏱️ Duration in minutes (optional)</span>
          </div>
        </div>

        {/* Critical Path Display */}
        {criticalPath.length > 0 && (
          <div className="bg-white bg-opacity-90 p-4 rounded-lg shadow-lg mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-3">🚀 Critical Path</h2>
            <div className="flex flex-wrap gap-2">
              {criticalPath.map((todo, index) => (
                <div key={todo.id} className="flex items-center">
                  <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm">
                    {todo.title}
                    {todo.estimatedDuration && ` (${formatDuration(todo.estimatedDuration)})`}
                  </span>
                  {index < criticalPath.length - 1 && (
                    <span className="mx-2 text-gray-500">→</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Total Duration: {formatDuration(criticalPath.reduce((sum, todo) => sum + (todo.estimatedDuration || 0), 0))}
            </div>
          </div>
        )}

        {/* Todos List */}
        <div className="grid gap-4">
          {todos.map((todo: TodoWithDependencies) => (
            <div
              key={todo.id}
              className={`bg-white bg-opacity-90 p-4 rounded-lg shadow-lg ${
                isInCriticalPath(todo.id) ? 'ring-2 ring-red-500' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-grow mr-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-gray-800 font-medium">{todo.title}</span>
                    {isInCriticalPath(todo.id) && (
                      <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs">Critical</span>
                    )}
                    {todo.estimatedDuration && (
                      <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs">
                        {formatDuration(todo.estimatedDuration)}
                      </span>
                    )}
                  </div>
                  
                  {todo.dueDate && (
                    <div className={`text-sm mb-2 ${
                      isOverdue(todo.dueDate.toString()) ? 'text-red-600 font-semibold' : 'text-gray-600'
                    }`}>
                      Due: {formatDate(todo.dueDate.toString())}
                      {isOverdue(todo.dueDate.toString()) && ' (Overdue)'}
                    </div>
                  )}
                  
                  {todo.earliestStartDate && (
                    <div className="text-sm text-gray-600 mb-2">
                      Earliest Start: {formatDate(todo.earliestStartDate.toString())}
                    </div>
                  )}
                  
                  {todo.dependencies && todo.dependencies.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Dependencies:</div>
                      <div className="flex flex-wrap gap-1">
                        {todo.dependencies.map((dep) => (
                          <div key={dep.required.id} className="flex items-center gap-1">
                            <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs">
                              {dep.required.title}
                            </span>
                            <button
                              onClick={() => handleRemoveDependency(todo.id, dep.required.id)}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
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
                
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedTodo(todo.id);
                      setShowDependencyModal(true);
                    }}
                    className="text-blue-500 hover:text-blue-700 transition duration-300"
                    title="Manage Dependencies"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="text-red-500 hover:text-red-700 transition duration-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dependency Management Modal */}
        {showDependencyModal && selectedTodo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full shadow-2xl border border-gray-700">
              <h3 className="text-lg font-bold mb-4 text-white">Manage Dependencies</h3>
              <div className="space-y-2">
                {todos
                  .filter(todo => todo.id !== selectedTodo)
                  .map(todo => (
                    <div key={todo.id} className="flex items-center justify-between p-2 border rounded border-gray-700 bg-gray-800">
                      <span className="text-sm text-white">{todo.title}</span>
                      <button
                        onClick={() => handleAddDependency(selectedTodo, todo.id)}
                        className="text-blue-300 hover:text-blue-400 text-sm font-semibold"
                      >
                        Add Dependency
                      </button>
                    </div>
                  ))}
              </div>
              <button
                onClick={() => setShowDependencyModal(false)}
                className="mt-4 w-full bg-gray-700 text-white p-2 rounded hover:bg-gray-600 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
