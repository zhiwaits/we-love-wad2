# Use official Python base image
FROM node:18-alpine

# Set work directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install PostgreSQL client
RUN apt-get update && apt-get install -y postgresql-client

# Copy source code
COPY . .

# Expose port the app runs on
EXPOSE 8006

# Set environment variables
ENV 
ENV 

# Command to run the application
CMD ["uvicorn", "appt:app", "--host", "0.0.0.0", "--port", "8006"]