import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Calendar, TrendingUp } from 'lucide-react';
import axios from 'axios';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subWeeks } from 'date-fns';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WeeklyProgress = () => {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState('');
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(0); // 0 = this week, 1 = last week, etc.
  const [chartType, setChartType] = useState('bar');

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (selectedTask && tasks.length > 0) {
      fetchWeeklyProgress();
    }
  }, [selectedTask, selectedWeek, tasks]);

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API}/life-tasks`);
      setTasks(response.data);
      if (response.data.length > 0) {
        setSelectedTask(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      toast.error('Failed to load tasks');
    }
  };

  const fetchWeeklyProgress = async () => {
    if (!selectedTask) return;
    
    setLoading(true);
    try {
      // Calculate date range for selected week
      const today = new Date();
      const targetWeek = subWeeks(today, selectedWeek);
      const weekStart = startOfWeek(targetWeek, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(targetWeek, { weekStartsOn: 1 }); // Sunday
      
      // Get all days in the week
      const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
      
      // Fetch progress entries for the task
      const response = await axios.get(`${API}/progress-entries/${selectedTask}`);
      const progressEntries = response.data;
      
      // Find the selected task info
      const task = tasks.find(t => t.id === selectedTask);
      const targetValue = task?.target_value || 100;
      
      // Create weekly data structure
      const weeklyProgressData = weekDays.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayName = format(day, 'EEE'); // Mon, Tue, etc.
        const entry = progressEntries.find(e => e.date === dateStr);
        
        return {
          day: dayName,
          date: dateStr,
          progress: entry ? entry.progress_value : 0,
          percentage: entry ? Math.round((entry.progress_value / targetValue) * 100) : 0,
          fullDate: format(day, 'MMM dd')
        };
      });
      
      setWeeklyData(weeklyProgressData);
    } catch (error) {
      console.error('Failed to fetch weekly progress:', error);
      toast.error('Failed to load weekly progress');
    } finally {
      setLoading(false);
    }
  };

  const getWeekLabel = (weekOffset) => {
    const today = new Date();
    const targetWeek = subWeeks(today, weekOffset);
    const weekStart = startOfWeek(targetWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(targetWeek, { weekStartsOn: 1 });
    
    if (weekOffset === 0) {
      return `This Week (${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd')})`;
    }
    return `${weekOffset} week${weekOffset > 1 ? 's' : ''} ago (${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd')})`;
  };

  const getWeekStats = () => {
    if (!weeklyData.length) return { total: 0, average: 0, best: 0, daysActive: 0 };
    
    const total = weeklyData.reduce((sum, day) => sum + day.progress, 0);
    const daysActive = weeklyData.filter(day => day.progress > 0).length;
    const average = daysActive > 0 ? Math.round(total / 7) : 0;
    const best = Math.max(...weeklyData.map(day => day.progress));
    
    return { total, average, best, daysActive };
  };

  const stats = getWeekStats();

  if (tasks.length === 0) {
    return (
      <Card className="p-12 text-center">
        <TrendingUp className="w-16 h-16 mx-auto mb-4 text-slate-400" />
        <h3 className="text-lg font-medium text-slate-800 mb-2">No tasks to track</h3>
        <p className="text-slate-600">Create some life tasks to see your weekly progress</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-600" />
              Weekly Progress
            </h2>
            <p className="text-slate-600">Track your progress trends over time</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedTask} onValueChange={setSelectedTask}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select a task" />
              </SelectTrigger>
              <SelectContent>
                {tasks.map(task => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedWeek.toString()} onValueChange={(value) => setSelectedWeek(parseInt(value))}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4].map(week => (
                  <SelectItem key={week} value={week.toString()}>
                    {getWeekLabel(week)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <Button
                variant={chartType === 'bar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('bar')}
                className="rounded-none border-none"
                data-testid="chart-type-bar"
              >
                Bar
              </Button>
              <Button
                variant={chartType === 'line' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('line')}
                className="rounded-none border-none"
                data-testid="chart-type-line"
              >
                Line
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-teal-600">{stats.total}</div>
          <div className="text-sm text-slate-600">Total Progress</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.average}</div>
          <div className="text-sm text-slate-600">Daily Average</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.best}</div>
          <div className="text-sm text-slate-600">Best Day</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.daysActive}/7</div>
          <div className="text-sm text-slate-600">Active Days</div>
        </Card>
      </div>

      {/* Chart */}
      <Card className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-80">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        ) : weeklyData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value, name) => [
                      `${value} progress`,
                      'Progress'
                    ]}
                    labelFormatter={(label) => {
                      const day = weeklyData.find(d => d.day === label);
                      return `${label} (${day?.fullDate})`;
                    }}
                  />
                  <Bar 
                    dataKey="progress" 
                    fill="#14b8a6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              ) : (
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value, name) => [
                      `${value} progress`,
                      'Progress'
                    ]}
                    labelFormatter={(label) => {
                      const day = weeklyData.find(d => d.day === label);
                      return `${label} (${day?.fullDate})`;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="progress" 
                    stroke="#14b8a6" 
                    strokeWidth={3}
                    dot={{ fill: '#14b8a6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#14b8a6' }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-80">
            <div className="text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-600">No progress data for this week</p>
              <p className="text-sm text-slate-500 mt-1">Start tracking progress to see your chart</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default WeeklyProgress;