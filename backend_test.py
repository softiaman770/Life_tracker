import requests
import sys
import json
from datetime import datetime, date
from typing import Dict, Any

class JournalLifeTrackerAPITester:
    def __init__(self, base_url="https://daily-journal-24.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, data: Dict[Any, Any] = None, headers: Dict[str, str] = None) -> tuple:
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json() if response.content else {}
                except:
                    response_data = {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json() if response.content else {"error": "No response content"}
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Raw response: {response.text}")
                response_data = {}

            self.test_results.append({
                "name": name,
                "method": method,
                "endpoint": endpoint,
                "expected_status": expected_status,
                "actual_status": response.status_code,
                "success": success,
                "response_data": response_data
            })

            return success, response_data

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.test_results.append({
                "name": name,
                "method": method,
                "endpoint": endpoint,
                "expected_status": expected_status,
                "actual_status": "ERROR",
                "success": False,
                "error": str(e)
            })
            return False, {}

    def test_basic_connection(self):
        """Test basic API connection"""
        return self.run_test("Basic API Connection", "GET", "", 200)

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        return self.run_test("Dashboard Stats", "GET", "stats/dashboard", 200)

    def test_journal_operations(self):
        """Test complete journal CRUD operations"""
        today = date.today().isoformat()
        
        # Test creating journal entry
        journal_data = {
            "date": today,
            "content": "This is a test journal entry for today."
        }
        success, response = self.run_test("Create Journal Entry", "POST", "journal-entries", 201, journal_data)
        
        if not success:
            return False
        
        # Test getting all journal entries
        success, _ = self.run_test("Get All Journal Entries", "GET", "journal-entries", 200)
        
        # Test getting specific journal entry by date
        success, _ = self.run_test("Get Journal Entry by Date", "GET", f"journal-entries/{today}", 200)
        
        # Test updating journal entry
        update_data = {"content": "Updated test journal entry content."}
        success, _ = self.run_test("Update Journal Entry", "PUT", f"journal-entries/{today}", 200, update_data)
        
        # Test deleting journal entry
        success, _ = self.run_test("Delete Journal Entry", "DELETE", f"journal-entries/{today}", 200)
        
        return True

    def test_life_task_operations(self):
        """Test complete life task CRUD operations"""
        # Test creating life task
        task_data = {
            "name": "Test Exercise Task",
            "description": "Daily exercise routine",
            "category": "Health",
            "target_value": 60
        }
        success, response = self.run_test("Create Life Task", "POST", "life-tasks", 200, task_data)
        
        if not success:
            return False
        
        task_id = response.get('id')
        if not task_id:
            print("❌ No task ID returned from create operation")
            return False
        
        # Test getting all life tasks
        success, _ = self.run_test("Get All Life Tasks", "GET", "life-tasks", 200)
        
        # Test updating life task
        update_data = {
            "name": "Updated Exercise Task",
            "description": "Updated daily exercise routine",
            "target_value": 90
        }
        success, _ = self.run_test("Update Life Task", "PUT", f"life-tasks/{task_id}", 200, update_data)
        
        # Test progress entry operations
        today = date.today().isoformat()
        progress_data = {
            "task_id": task_id,
            "date": today,
            "progress_value": 45,
            "notes": "Good progress today"
        }
        success, _ = self.run_test("Create Progress Entry", "POST", "progress-entries", 200, progress_data)
        
        # Test getting progress entries for task
        success, _ = self.run_test("Get Progress Entries", "GET", f"progress-entries/{task_id}", 200)
        
        # Test weekly progress
        success, _ = self.run_test("Get Weekly Progress", "GET", f"progress-entries/week/{task_id}", 200)
        
        # Test deleting life task (should also delete progress entries)
        success, _ = self.run_test("Delete Life Task", "DELETE", f"life-tasks/{task_id}", 200)
        
        return True

    def test_error_handling(self):
        """Test API error handling"""
        # Test getting non-existent journal entry
        success, _ = self.run_test("Get Non-existent Journal Entry", "GET", "journal-entries/2099-12-31", 200)
        
        # Test updating non-existent journal entry
        update_data = {"content": "This should fail"}
        success, _ = self.run_test("Update Non-existent Journal Entry", "PUT", "journal-entries/2099-12-31", 404, update_data)
        
        # Test deleting non-existent journal entry
        success, _ = self.run_test("Delete Non-existent Journal Entry", "DELETE", "journal-entries/2099-12-31", 404)
        
        # Test updating non-existent life task
        update_data = {"name": "This should fail"}
        success, _ = self.run_test("Update Non-existent Life Task", "PUT", "life-tasks/non-existent-id", 404, update_data)
        
        # Test deleting non-existent life task
        success, _ = self.run_test("Delete Non-existent Life Task", "DELETE", "life-tasks/non-existent-id", 404)
        
        return True

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Journal & Life Tracker API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 60)
        
        # Test basic connection first
        success, _ = self.test_basic_connection()
        if not success:
            print("❌ Basic API connection failed. Stopping tests.")
            return False
        
        # Test dashboard stats
        self.test_dashboard_stats()
        
        # Test journal operations
        print("\n📖 Testing Journal Operations...")
        self.test_journal_operations()
        
        # Test life task operations
        print("\n🎯 Testing Life Task Operations...")
        self.test_life_task_operations()
        
        # Test error handling
        print("\n🚨 Testing Error Handling...")
        self.test_error_handling()
        
        # Print final results
        print("\n" + "=" * 60)
        print(f"📊 Final Results: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("🎉 API tests mostly successful!")
        elif success_rate >= 60:
            print("⚠️  API has some issues but core functionality works")
        else:
            print("❌ API has significant issues")
        
        return success_rate >= 60

def main():
    tester = JournalLifeTrackerAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            "summary": {
                "tests_run": tester.tests_run,
                "tests_passed": tester.tests_passed,
                "success_rate": (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
            },
            "detailed_results": tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())