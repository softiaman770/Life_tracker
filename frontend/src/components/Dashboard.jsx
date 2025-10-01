import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { BookOpen, Target, Calendar, TrendingUp } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ onNavigate }) => {
  const [stats, setStats] = useState({
    total_journal_entries: 0,
    total_life_tasks: 0,
    has_today_journal: false,
    today_progress_count: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get(`${API}/stats/dashboard`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getTodayDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const quickActions = [
    {
      title: 'Write Today\'s Journal',
      description: 'Capture your thoughts and experiences',
      icon: BookOpen,
      action: () => onNavigate('journal'),
      color: 'bg-blue-50 text-blue-600 border-blue-200',
      disabled: stats.has_today_journal
    },
    {
      title: 'Update Life Tracker',
      description: 'Log progress on your goals',
      icon: Target,
      action: () => onNavigate('life-tracker'),
      color: 'bg-teal-50 text-teal-600 border-teal-200'
    }
  ];

  const statCards = [
    {
      title: 'Total Journal Entries',
      value: stats.total_journal_entries,
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Life Tasks',
      value: stats.total_life_tasks,
      icon: Target,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50'
    },
    {
      title: 'Today\'s Progress Logs',
      value: stats.today_progress_count,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ];

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-48"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          {getGreeting()}! 👋
        </h1>
        <p className="text-slate-600 text-lg">
          {getTodayDate()}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="p-6 card-hover">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-slate-900">
                    {stat.value}
                  </p>
                </div>
                <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Card key={index} className={`p-6 cursor-pointer card-hover ${action.disabled ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800 mb-1">
                      {action.title}
                      {action.disabled && <span className="text-green-600 ml-2">✓</span>}
                    </h3>
                    <p className="text-sm text-slate-600 mb-3">
                      {action.description}
                    </p>
                    <Button 
                      size="sm" 
                      onClick={action.action}
                      disabled={action.disabled}
                      data-testid={`quick-action-${index}-btn`}
                      className={action.disabled ? 'bg-gray-400 cursor-not-allowed' : ''}
                    >
                      {action.disabled ? 'Completed' : 'Go'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Motivational Quote */}
      <Card className="p-6 bg-gradient-to-r from-teal-50 to-blue-50 border-teal-200">
        <div className="text-center">
          <blockquote className="text-lg font-medium text-slate-800 mb-2">
            "The secret of getting ahead is getting started."
          </blockquote>
          <cite className="text-sm text-slate-600">— Mark Twain</cite>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;