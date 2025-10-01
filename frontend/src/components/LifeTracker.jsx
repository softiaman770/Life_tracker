import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Plus, Edit, Trash2, Target, TrendingUp, Calendar } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import WeeklyProgress from './WeeklyProgress';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LifeTracker = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [progressEntries, setProgressEntries] = useState({});
  const [todayProgress, setTodayProgress] = useState({});

  // Form states
  const [taskForm, setTaskForm] = useState({
    name: '',
    description: '',
    category: 'General',
    target_value: 100
  });

  useEffect(() => {
    fetchLifeTasks();
  }, []);

  useEffect(() => {
    if (tasks.length > 0) {
      fetchTodayProgress();
    }
  }, [tasks]);

  const fetchLifeTasks = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/life-tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch life tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayProgress = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const progressPromises = tasks.map(async (task) => {
        try {
          const response = await axios.get(`${API}/progress-entries/${task.id}`);
          const todayEntry = response.data.find(entry => entry.date === today);
          return { taskId: task.id, progress: todayEntry ? todayEntry.progress_value : 0 };
        } catch (error) {
          return { taskId: task.id, progress: 0 };
        }
      });

      const results = await Promise.all(progressPromises);
      const progressMap = {};
      results.forEach(result => {
        progressMap[result.taskId] = result.progress;
      });
      setTodayProgress(progressMap);
    } catch (error) {
      console.error('Failed to fetch today\'s progress:', error);
    }
  };

  const createTask = async () => {
    if (!taskForm.name.trim()) {
      toast.error('Task name is required');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/life-tasks`, taskForm);
      toast.success('Task created successfully');
      setIsAddingTask(false);
      setTaskForm({ name: '', description: '', category: 'General', target_value: 100 });
      fetchLifeTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
      toast.error('Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async () => {
    if (!selectedTask || !taskForm.name.trim()) return;

    setLoading(true);
    try {
      await axios.put(`${API}/life-tasks/${selectedTask.id}`, taskForm);
      toast.success('Task updated successfully');
      setSelectedTask(null);
      fetchLifeTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Failed to update task');
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task? All progress will be lost.')) return;

    setLoading(true);
    try {
      await axios.delete(`${API}/life-tasks/${taskId}`);
      toast.success('Task deleted successfully');
      fetchLifeTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('Failed to delete task');
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (taskId, progressValue) => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      await axios.post(`${API}/progress-entries`, {
        task_id: taskId,
        date: today,
        progress_value: progressValue
      });
      
      setTodayProgress(prev => ({ ...prev, [taskId]: progressValue }));
      toast.success('Progress updated');
    } catch (error) {
      console.error('Failed to update progress:', error);
      toast.error('Failed to update progress');
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Health': 'bg-green-100 text-green-800 border-green-200',
      'Career': 'bg-blue-100 text-blue-800 border-blue-200',
      'Personal': 'bg-purple-100 text-purple-800 border-purple-200',
      'Learning': 'bg-orange-100 text-orange-800 border-orange-200',
      'General': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[category] || colors['General'];
  };

  const resetTaskForm = () => {
    setTaskForm({ name: '', description: '', category: 'General', target_value: 100 });
  };

  const openEditDialog = (task) => {
    setSelectedTask(task);
    setTaskForm({
      name: task.name,
      description: task.description || '',
      category: task.category || 'General',
      target_value: task.target_value || 100
    });
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Life Tracker</h1>
          <p className="text-slate-600">Manage and track your personal goals</p>
        </div>

        <Dialog open={isAddingTask} onOpenChange={setIsAddingTask}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetTaskForm(); setIsAddingTask(true); }} data-testid="add-task-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Life Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Task Name</label>
                <Input
                  value={taskForm.name}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Daily Exercise, Read Books"
                  data-testid="task-name-input"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700">Description</label>
                <Textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your goal..."
                  data-testid="task-description-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Category</label>
                  <Select value={taskForm.category} onValueChange={(value) => setTaskForm(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="General">General</SelectItem>
                      <SelectItem value="Health">Health</SelectItem>
                      <SelectItem value="Career">Career</SelectItem>
                      <SelectItem value="Personal">Personal</SelectItem>
                      <SelectItem value="Learning">Learning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Target Value</label>
                  <Input
                    type="number"
                    value={taskForm.target_value}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, target_value: parseInt(e.target.value) || 100 }))}
                    placeholder="100"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={createTask} disabled={loading} data-testid="create-task-btn">
                  {loading ? 'Creating...' : 'Create Task'}
                </Button>
                <Button variant="outline" onClick={() => setIsAddingTask(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map((task) => {
          const progress = todayProgress[task.id] || 0;
          const progressPercentage = (progress / task.target_value) * 100;

          return (
            <Card key={task.id} className="p-6 card-hover">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800 mb-2">{task.name}</h3>
                  <Badge className={getCategoryColor(task.category)}>
                    {task.category}
                  </Badge>
                </div>
                
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(task)}
                    data-testid={`edit-task-${task.id}-btn`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTask(task.id)}
                    className="text-red-600 hover:text-red-700"
                    data-testid={`delete-task-${task.id}-btn`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {task.description && (
                <p className="text-sm text-slate-600 mb-4">{task.description}</p>
              )}

              {/* Progress Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Today's Progress</span>
                  <span className="font-medium">{progress} / {task.target_value}</span>
                </div>

                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-700">Update Progress</label>
                  <Slider
                    value={[progress]}
                    onValueChange={(value) => updateProgress(task.id, value[0])}
                    max={task.target_value}
                    step={1}
                    className="w-full"
                    data-testid={`progress-slider-${task.id}`}
                  />
                </div>
              </div>
            </Card>
          );
        })}

        {tasks.length === 0 && !loading && (
          <div className="col-span-full">
            <Card className="p-12 text-center">
              <Target className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">No life tasks yet</h3>
              <p className="text-slate-600 mb-6">Start tracking your personal goals and habits</p>
              <Button onClick={() => setIsAddingTask(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Task
              </Button>
            </Card>
          </div>
        )}
      </div>

      {/* Edit Task Dialog */}
      <Dialog open={selectedTask !== null} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Task Name</label>
              <Input
                value={taskForm.name}
                onChange={(e) => setTaskForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Daily Exercise, Read Books"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700">Description</label>
              <Textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your goal..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Category</label>
                <Select value={taskForm.category} onValueChange={(value) => setTaskForm(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Health">Health</SelectItem>
                    <SelectItem value="Career">Career</SelectItem>
                    <SelectItem value="Personal">Personal</SelectItem>
                    <SelectItem value="Learning">Learning</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Target Value</label>
                <Input
                  type="number"
                  value={taskForm.target_value}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, target_value: parseInt(e.target.value) || 100 }))}
                  placeholder="100"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={updateTask} disabled={loading} data-testid="update-task-btn">
                {loading ? 'Updating...' : 'Update Task'}
              </Button>
              <Button variant="outline" onClick={() => setSelectedTask(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loading State */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
            <p className="text-center mt-2">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LifeTracker;