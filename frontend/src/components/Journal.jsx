import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarIcon, Save, Edit, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Journal = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [journalContent, setJournalContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasEntry, setHasEntry] = useState(false);

  useEffect(() => {
    fetchJournalEntries();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchJournalEntryByDate(selectedDate);
    }
  }, [selectedDate]);

  const fetchJournalEntries = async () => {
    try {
      const response = await axios.get(`${API}/journal-entries`);
      setEntries(response.data);
    } catch (error) {
      console.error('Failed to fetch journal entries:', error);
      toast.error('Failed to load journal entries');
    }
  };

  const fetchJournalEntryByDate = async (date) => {
    setLoading(true);
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const response = await axios.get(`${API}/journal-entries/${formattedDate}`);
      
      if (response.data) {
        setJournalContent(response.data.content);
        setHasEntry(true);
        setIsEditing(false);
      } else {
        setJournalContent('');
        setHasEntry(false);
        setIsEditing(true);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setJournalContent('');
        setHasEntry(false);
        setIsEditing(true);
      } else {
        console.error('Failed to fetch journal entry:', error);
        toast.error('Failed to load journal entry');
      }
    } finally {
      setLoading(false);
    }
  };

  const saveJournalEntry = async () => {
    if (!journalContent.trim()) {
      toast.error('Journal entry cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      
      if (hasEntry) {
        await axios.put(`${API}/journal-entries/${formattedDate}`, {
          content: journalContent
        });
        toast.success('Journal entry updated successfully');
      } else {
        await axios.post(`${API}/journal-entries`, {
          date: formattedDate,
          content: journalContent
        });
        toast.success('Journal entry created successfully');
        setHasEntry(true);
      }
      
      setIsEditing(false);
      fetchJournalEntries();
    } catch (error) {
      console.error('Failed to save journal entry:', error);
      toast.error('Failed to save journal entry');
    } finally {
      setLoading(false);
    }
  };

  const deleteJournalEntry = async () => {
    if (!hasEntry) return;
    
    if (!confirm('Are you sure you want to delete this journal entry?')) return;

    setLoading(true);
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      await axios.delete(`${API}/journal-entries/${formattedDate}`);
      
      setJournalContent('');
      setHasEntry(false);
      setIsEditing(true);
      
      toast.success('Journal entry deleted successfully');
      fetchJournalEntries();
    } catch (error) {
      console.error('Failed to delete journal entry:', error);
      toast.error('Failed to delete journal entry');
    } finally {
      setLoading(false);
    }
  };

  const getEntriesForMonth = () => {
    const month = selectedDate.getMonth();
    const year = selectedDate.getFullYear();
    
    return entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getMonth() === month && entryDate.getFullYear() === year;
    }).map(entry => new Date(entry.date));
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Journal</h1>
          <p className="text-slate-600">Capture your daily thoughts and experiences</p>
        </div>
        
        {/* Date Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className="w-60 justify-start text-left font-normal"
              data-testid="date-picker-trigger"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={{
                hasEntry: getEntriesForMonth()
              }}
              modifiersStyles={{
                hasEntry: { 
                  backgroundColor: '#14b8a6', 
                  color: 'white',
                  borderRadius: '4px'
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Journal Entry Editor */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">
                {format(selectedDate, 'EEEE, MMMM do, yyyy')}
              </h2>
              
              <div className="flex gap-2">
                {hasEntry && !isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    data-testid="edit-journal-btn"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
                
                {hasEntry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deleteJournalEntry}
                    disabled={loading}
                    className="text-red-600 hover:text-red-700"
                    data-testid="delete-journal-btn"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                )}
                
                {isEditing && (
                  <Button
                    size="sm"
                    onClick={saveJournalEntry}
                    disabled={loading}
                    data-testid="save-journal-btn"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Saving...' : 'Save'}
                  </Button>
                )}
              </div>
            </div>

            {loading && !isEditing ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                <div className="h-4 bg-slate-200 rounded w-5/6"></div>
              </div>
            ) : isEditing ? (
              <Textarea
                value={journalContent}
                onChange={(e) => setJournalContent(e.target.value)}
                placeholder="What's on your mind today? Write about your experiences, thoughts, feelings, or anything that matters to you..."
                className="min-h-96 journal-entry resize-none text-base leading-relaxed"
                data-testid="journal-textarea"
              />
            ) : (
              <div className="min-h-96 p-4 bg-slate-50 rounded-lg">
                {journalContent ? (
                  <div className="whitespace-pre-wrap text-slate-800 leading-relaxed">
                    {journalContent}
                  </div>
                ) : (
                  <div className="text-slate-500 italic text-center py-20">
                    <Plus className="w-8 h-8 mx-auto mb-4" />
                    No entry for this date. Click Edit to add one.
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Recent Entries Sidebar */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold text-slate-800 mb-4">Recent Entries</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {entries.slice(0, 10).map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => setSelectedDate(new Date(entry.date))}
                  data-testid={`recent-entry-${entry.date}`}
                >
                  <div className="text-sm font-medium text-slate-800 mb-1">
                    {format(new Date(entry.date), 'MMM dd, yyyy')}
                  </div>
                  <div className="text-xs text-slate-600 line-clamp-2">
                    {entry.content.substring(0, 100)}...
                  </div>
                </div>
              ))}
              
              {entries.length === 0 && (
                <div className="text-center text-slate-500 py-8">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No entries yet</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-slate-800 mb-4">Writing Tips</h3>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-teal-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Write about your emotions and how events made you feel</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-teal-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Include specific details about your day</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-teal-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Reflect on lessons learned or insights gained</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-teal-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Set intentions or goals for tomorrow</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Journal;