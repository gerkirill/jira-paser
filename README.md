#  Jira Parser

This is a simple script that parses Jira issues and converts them to markdown files.

## Usage

1. Install dependencies: `npm install`
2. Set environment variables:
   - `BASE_URL`: Jira base URL, e.g. https://velocity.company.com/jira (without trailing slash)
   - `PROJECT`: Jira project key, e.g. PRJ
   - `USERNAME`: Jira username
   - `PASSWORD`: Jira password
   Optionally, you can create a `.env` file with the above variables and run script with `./run.sh` instead of `npm run start`.
3. Run the script: `npm run start`

## Output

The script will create a `issues` directory with markdown files for each Jira issue.    

