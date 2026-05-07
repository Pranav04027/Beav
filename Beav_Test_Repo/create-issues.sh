#!/bin/bash

# This script creates GitHub issues for the Beav Test App bugs
# Run this after pushing the repo to GitHub
# Usage: ./create-issues.sh <owner> <repo>

OWNER=$1
REPO=$2

if [ -z "$OWNER" ] || [ -z "$REPO" ]; then
  echo "Usage: $0 <owner> <repo>"
  exit 1
fi

gh auth status || exit 1

echo "Creating issues in ${OWNER}/${REPO}..."

gh issue create --title "Fix add function returning incorrect result" --body "The add function is returning a - b instead of a + b.\n\n**File:** src/calculator.js\n**Expected:** add(2, 3) should return 5\n**Actual:** add(2, 3) returns -1" --label "autofix"

gh issue create --title "Fix subtract function returning incorrect result" --body "The subtract function is returning a + b instead of a - b.\n\n**File:** src/calculator.js\n**Expected:** subtract(10, 4) should return 6\n**Actual:** subtract(10, 4) returns 14" --label "autofix"

gh issue create --title "Fix multiply function returning wrong value" --body "The multiply function is multiplying a by itself instead of by b.\n\n**File:** src/calculator.js\n**Expected:** multiply(3, 4) should return 12\n**Actual:** multiply(3, 4) returns 9" --label "autofix"

gh issue create --title "Fix average function dividing by wrong count" --body "The average function divides by (length - 1) instead of length.\n\n**File:** src/calculator.js\n**Expected:** average([1, 2, 3, 4, 5]) should return 3\n**Actual:** average([1, 2, 3, 4, 5]) returns 3.75" --label "autofix"

gh issue create --title "Fix factorial(0) returning 0 instead of 1" --body "The factorial function returns 0 when n === 0, but mathematically 0! = 1.\n\n**File:** src/calculator.js\n**Expected:** factorial(0) should return 1\n**Actual:** factorial(0) returns 0" --label "autofix"

gh issue create --title "Fix capitalize function capitalizing wrong character" --body "The capitalize function capitalizes the second character (index 1) instead of the first (index 0).\n\n**File:** src/strings.js\n**Expected:** capitalize('hello') should return 'Hello'\n**Actual:** capitalize('hello') returns 'Eello'" --label "autofix"

gh issue create --title "Fix reverse function producing incorrect output" --body "The reverse function has an off-by-one error in its loop, starting from index 1 instead of 0.\n\n**File:** src/strings.js\n**Expected:** reverse('hello') should return 'olleh'\n**Actual:** reverse('hello') returns 'elloundefined'" --label "autofix"

gh issue create --title "Fix truncate function not adding ellipsis" --body "The truncate function does not add '...' when truncating.\n\n**File:** src/strings.js\n**Expected:** truncate('hello world', 5) should return 'hello...'\n**Actual:** truncate('hello world', 5) returns 'hello'" --label "autofix"

gh issue create --title "Fix unique function returning duplicates instead of unique values" --body "The unique function uses !== instead of ===, so it returns duplicate values instead of unique ones.\n\n**File:** src/arrays.js\n**Expected:** unique([1, 2, 2, 3]) should return [1]\n**Actual:** unique([1, 2, 2, 3]) returns [2]" --label "autofix"

gh issue create --title "Fix flatten function not flattening nested arrays" --body "The flatten function pushes the entire sub-array instead of spreading its elements.\n\n**File:** src/arrays.js\n**Expected:** flatten([[1, 2], [3, 4]]) should return [1, 2, 3, 4]\n**Actual:** flatten([[1, 2], [3, 4]]) returns [[1,2],[3,4]]" --label "autofix"

gh issue create --title "Fix sum function returning incorrect total" --body "The sum function starts with initial value 1 instead of 0.\n\n**File:** src/arrays.js\n**Expected:** sum([1, 2, 3, 4]) should return 10\n**Actual:** sum([1, 2, 3, 4]) returns 11" --label "autofix"

echo "Done! Created 11 autofix issues."
