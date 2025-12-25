/**
 * @file Gridlines API Service
 * @description This file contains  helper functions to interact with the Gridlines API.
 * It is designed to be called dynamically by the verificationController.
 *
 * @requires an environment variable `REACT_APP_GRIDLINES_API_KEY` to be set.
 */
import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();
const API_BASE_URL = 'https://api.gridlines.io';
import * as gridlines from '../services/gridLinesService.js';

const API_KEY = process.env.GRIDLINES_API_KEY; // Use environment variables in production

/**
 * A generic helper function to make POST requests with a JSON body.
 * It automatically adds the API key and consent parameter.
 * @param {string} endpoint - The API endpoint path (e.g., '/profile-api/mobile/address-lookup').
 * @param {object} body - The request body object.
 * @returns {Promise<object>} - A promise that resolves to the 'data' object from the API response.
 * @throws {Error} - Throws an error if the API call fails or returns a non-200 status.
 */
export const callJsonApi = async (endpoint, body = {}) => {
    if (!API_KEY) {
        throw new Error("Gridlines API key is not configured.");
    }
    if (body && ('consent_text' in body)) {
        body.consent_text = 'I provide consent to fetch information.';
    }

    const requestBody = {
        ...body,
        consent: "Y", // Mandatory consent parameter
    };
      
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
                'X-Auth-Type': 'API-Key',
                'X-Reference-ID': '',
            },
            body: JSON.stringify(requestBody),
        }); 

        const result = await response.json();

        if (!response.ok || result.status !== 200) {
            console.error(`❌ Error details for endpoint: ${endpoint}`, {
                status: response.status,
                statusText: response.statusText,
                responseBody: result
            });
            // console.log(result)
            const msg = result?.error?.message || result?.error?.metadata?.fields?.[0]?.message || `Request failed`;
            throw new Error(msg);
        }

        return result.data;
    } catch (error) {
        const msg = error?.message || error?.metadata?.fields?.[0]?.message || error.data.error.message  || `Request failed`;
        if (msg === 'Bad request.') {
            throw new Error('Invalid request. Please check the input data and try again.');
        }
        throw new Error(msg);
        // console.error(`❌ Error calling Gridlines endpoint ${endpoint}:`, error);
        // throw error;
    }
};

/**
 * A  helper function to make POST requests with FormData (for file uploads).
 * It automatically adds the API key and consent parameter.
 * @param {string} endpoint - The API endpoint path.
 * @param {FormData} formData - The FormData object containing the file(s) and other fields.
 * @param {string} referenceId - The reference ID to be passed in the header.
 * @returns {Promise<object>} - A promise that resolves to the 'data' object from the API response.
 * @throws {Error} - Throws an error if the API call fails or returns a non-200 status.
 */
export const callFormApi = async (endpoint, formData, referenceId = '') => {
    if (!API_KEY) {
        throw new Error("Gridlines API key is not configured.");
    }

    formData.append('consent', 'Y'); 
    
    // console.log('Sending FormData to endpoint:', endpoint);

    try {
        const response = await axios.post(`${API_BASE_URL}${endpoint}`, formData, {
            headers: {
                'Accept': 'application/json',
                'X-API-Key': API_KEY,
                'X-Auth-Type': 'API-Key',
                // **FIXED**: Use the passed referenceId directly
                'X-Reference-ID': referenceId,
                // This line is correct for the 'form-data' library
                ...formData.getHeaders()
            }
        });

        const result = response.data;
     

        if (response.status !== 200 || result.status !== 200) {
            console.error(`❌ API error details for endpoint: ${endpoint}`, {
                status: response.status,
                statusText: response.statusText,
                responseBody: result
            });
            const msg = result?.error?.message || result?.error?.metadata?.fields?.[0]?.message || `Request failed`;
            throw new Error(msg);
        }

        return result.data;
    } catch (error) {
        console.error('FormData API Error:', error);
        if (error.response) {
            const msg = error.response.data?.error?.message || error.response.data?.error?.metadata?.fields?.[0]?.message || `Request failed`;
            throw new Error(msg);
        }
        const msg = error?.message || `Request failed`;
        throw new Error(msg);
    }
};

/**
 * GSTIN Verification Function
 */
// gridLinesService.js mein verifyGSTIN function ko update karo:
export const verifyGSTIN = async (gstin) => {
  if (!API_KEY) {
    throw new Error("Gridlines API key is not configured.");
  }

  // ✅ CORRECT ENDPOINT (from your working UI)
  const endpoint = '/gstin-api/fetch-detailed';

  const requestBody = {
    gstin: gstin.toUpperCase(),
    consent: "Y"
  };

  try {
 
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'X-Auth-Type': 'API-Key',
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    
    if (!response.ok || result.status !== 200) {
      const msg = result?.error?.message || 'GSTIN verification failed';
      throw new Error(msg);
    }

    if (!result.data) {
      throw new Error("No data returned from GSTIN API");
    }

    return result.data;
    
  } catch (error) {
    console.error(`❌ GSTIN Error:`, error);
    throw new Error(error.message || 'GSTIN verification failed');
  }
};