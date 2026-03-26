require("dotenv").config();
const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json());

// 🔧 CONFIG
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// 🔐 DB CONFIG (Update these if needed)
const TABLES_TO_SEARCH = ["nr_wf", "nurture", "followup"];
const NAME_COLUMN = "Name";
const PHONE_COLUMN = "Phone";

// 🔐 AUTH
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Optimized search across multiple tables (nr_wf, nurture, followup)
 * Designed for 10+ concurrent calls and high stability.
 */
async function getCustomerName(phoneNumber) {
  if (!phoneNumber) return null;

  try {
    // Search all 3 tables in parallel for maximum speed
    const searchPromises = TABLES_TO_SEARCH.map(async (tableName) => {
      // Direct database lookup using .eq() filter for high efficiency
      const { data, error } = await supabase
        .from(tableName)
        .select(NAME_COLUMN)
        .eq(PHONE_COLUMN, phoneNumber) // Search for exact match
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(`[DB Error] ${tableName}:`, error.message);
        return null;
      }
      return data ? data[NAME_COLUMN] : null;
    });

    const results = await Promise.all(searchPromises);

    // Return the first name found across all tables
    const foundName = results.find(name => name != null);

    return foundName || null;

  } catch (err) {
    console.error("[Critical Error] Global search failure:", err);
    return null;
  }
}

app.post("/assistant-selector", async (req, res) => {
  try {
    if (req.body.message?.type === "assistant-request") {
      const phoneNumber = req.body.message?.call?.customer?.number;
      console.log(`[${new Date().toISOString()}] Incoming Request: ${phoneNumber}`);

      // Start fetching the name immediately
      const customerName = await getCustomerName(phoneNumber);

      console.log(`[Result] Phone: ${phoneNumber} -> Name: ${customerName || "Not Found"}`);

      res.json({
        assistantId: "02b53341-2f4f-44aa-a264-292e0ad57589",
        assistantOverrides: {
          variableValues: {
            customerName: customerName || "there"
          }
        }
      });
    } else {
      // Not an assistant-request, but we should still respond to keep Vapi happy
      res.status(200).send("OK");
    }
  } catch (err) {
    console.error("[Server Error]:", err);

    res.json({
      assistantId: "02b53341-2f4f-44aa-a264-292e0ad57589",
      assistantOverrides: {
        variableValues: {
          customerName: "there"
        }
      }
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 High-Performance Vapi Server Running`);
  console.log(`📅 Started at: ${new Date().toLocaleString()}`);
  console.log(`📊 Searching Tables: ${TABLES_TO_SEARCH.join(", ")}`);
  console.log(`📡 Port: ${PORT}\n`);
});

