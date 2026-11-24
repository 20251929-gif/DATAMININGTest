import os
import tempfile
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pyspark.sql import SparkSession
from pyspark.sql import functions as F

app = FastAPI()

# Allow Angular dev server (localhost:4200) to communicate with FastAPI (localhost:8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize SparkSession once when the backend starts
spark = (
    SparkSession.builder
    .appName("DentalClinicCleaner")
    .master("local[*]")
    .getOrCreate()
)

@app.post("/api/analyze-csv")
async def analyze_csv(file: UploadFile = File(...)):
    # Save uploaded CSV temporarily so PySpark can read it from disk
    with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        df = spark.read.csv(tmp_path, header=True, inferSchema=False)

        # Step 1: Data Cleaning (trim whitespace, normalize "N/A", parse dates & numbers)
        cleaned_df = (
            df.select(
                F.trim(F.col("Visit ID")).alias("visit_id"),
                F.trim(F.col("Name")).alias("patient_name"),
                F.to_date(F.trim(F.col("Date Visited")), "MM/dd/yyyy").alias("date_visited"),
                F.trim(F.col("Nature of Visit")).alias("nature_of_visit"),
                F.when(F.trim(F.col("Teeth Operated")) == "N/A", None)
                 .otherwise(F.trim(F.col("Teeth Operated")).cast("int"))
                 .alias("tooth_operated"),
                F.coalesce(F.trim(F.col("Fee")).cast("double"), F.lit(0.0)).alias("fee")
            )
            .filter(F.col("visit_id").isNotNull())
        )

        # Step 2: Data Mining (group by month, deduplicate Visit IDs, sum profits)
        monthly_df = (
            cleaned_df
            .withColumn("monthKey", F.date_format("date_visited", "yyyy-MM"))
            .withColumn("monthLabel", F.date_format("date_visited", "MMMM yyyy"))
            .groupBy("monthKey", "monthLabel")
            .agg(
                F.countDistinct("visit_id").alias("totalVisits"),
                F.count("nature_of_visit").alias("totalProcedures"),
                F.sum("fee").alias("totalProfit")
            )
            .orderBy("monthKey")
        )

        return [row.asDict() for row in monthly_df.collect()]

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
