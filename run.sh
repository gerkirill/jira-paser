#!/bin/bash

export $(grep -v '^#' .env | xargs) && npm run start