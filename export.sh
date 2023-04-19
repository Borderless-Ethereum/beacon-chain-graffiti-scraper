#!/bin/bash

cd ./dbdumps/

# Get the last slot that was export and assign it to a variable
LASTSLOT=$(tail -n 1 "slots_$(date -d "yesterday" '+%Y-%m-%d').csv" | cut -d',' -f1 | sed 's/"//g')

# Print the value of the variable
echo "The last slot that was export is: $LASTSLOT"

# Increment the value of the LASTSLOT variable by 1
((LASTSLOT++))

# Download the data using curl and the value of the variable
curl -s "http://localhost:3000/slots/$LASTSLOT" -o "slots_$(date +'%Y-%m-%d').csv"

# set the S3 bucket name and file path
BUCKET_NAME="bucketname"
FILE_PATH="slots_$(date +'%Y-%m-%d').csv"

# use the AWS CLI to upload the file to S3
aws s3 cp $FILE_PATH s3://$BUCKET_NAME/
