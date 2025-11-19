{
	"info": {
		"_postman_id": "98fe6520-813f-4ed1-bfce-666b74d7ea65",
		"name": "Dentalization Engine API",
		"description": "AI Agent API collection for Dental Analysis Engine\n\n## AI Agent Philosophy\n- Fully autonomous decision making\n- Natural conversation flow\n- Agent decides tools usage automatically\n- No hardcoded triggers or explicit analysis requests\n\n## Features\n- Automated session management\n- Dynamic resource tracking\n- Comprehensive error handling\n- Environment variable integration\n- Response validation & testing\n\n## Usage\n1. Import collection to Postman\n2. Set environment variables (base_url, etc.)\n3. Run requests in sequence or individually\n4. Let the AI agent decide autonomously\n\n## Environment Variables Required\n- `base_url`: API base URL (e.g., http://localhost:8000)\n- `api_version`: API version (default: v1)\n\n## Auto-Generated Variables\n- `session_id`: Current session ID\n- `image_id`: Last uploaded image ID\n- `resource_id`: Last generated resource ID",
		"schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
		"_exporter_id": "29741804"
	},
	"item": [
		{
			"name": "🏥 System Health",
			"item": [
				{
					"name": "Health Check",
					"event": [
						{
							"listen": "test",
							"script": {
								"exec": [
									"pm.test('Service is healthy', function () {",
									"    const jsonData = pm.response.json();",
									"    pm.expect(jsonData.status).to.eql('success');",
									"    pm.expect(jsonData.dependencies).to.be.an('object');",
									"});",
									"",
									"pm.test('Dependencies are available', function () {",
									"    const jsonData = pm.response.json();",
									"    const deps = jsonData.dependencies;",
									"    pm.expect(deps.agent).to.be.true;",
									"    pm.expect(deps.storage).to.be.true;",
									"});",
									"",
									"// Store service info",
									"const jsonData = pm.response.json();",
									"pm.collectionVariables.set('service_version', jsonData.version);",
									"pm.collectionVariables.set('service_uptime', jsonData.uptime);",
									"",
									"console.log('🔧 Service Version: ' + jsonData.version);",
									"console.log('⏱️ Uptime: ' + jsonData.uptime + 's');"
								],
								"type": "text/javascript"
							}
						}
					],
					"request": {
						"method": "GET",
						"header": [],
						"url": {
							"raw": "{{base_url}}/api/{{api_version}}/health",
							"host": [
								"{{base_url}}"
							],
							"path": [
								"api",
								"{{api_version}}",
								"health"
							]
						},
						"description": "Check system health and dependencies status"
					},
					"response": []
				}
			],
			"description": "System health and status endpoints"
		},
		{
			"name": "👥 Session Management",
			"item": [
				{
					"name": "Create Session",
					"event": [
						{
							"listen": "test",
							"script": {
								"exec": [
									"pm.test('Session created successfully', function () {",
									"    const jsonData = pm.response.json();",
									"    pm.expect(jsonData.status).to.eql('success');",
									"    pm.expect(jsonData.session.id).to.be.a('string');",
									"});",
									"",
									"// Store session ID for use in other requests",
									"const jsonData = pm.response.json();",
									"const sessionId = jsonData.session.id;",
									"pm.collectionVariables.set('session_id', sessionId);",
									"",
									"console.log('🆔 Session ID: ' + sessionId);",
									"console.log('📅 Created: ' + jsonData.created_at);",
									"console.log('⏰ Expires: ' + jsonData.expires_at);"
								],
								"type": "text/javascript"
							}
						}
					],
					"request": {
						"method": "POST",
						"header": [],
						"url": {
							"raw": "{{base_url}}/api/{{api_version}}/sessions",
							"host": [
								"{{base_url}}"
							],
							"path": [
								"api",
								"{{api_version}}",
								"sessions"
							]
						},
						"description": "Create a new chat session"
					},
					"response": []
				},
				{
					"name": "Get Session Details",
					"event": [
						{
							"listen": "prerequest",
							"script": {
								"exec": [
									"// Ensure we have a session ID",
									"const sessionId = pm.collectionVariables.get('session_id');",
									"if (!sessionId) {",
									"    console.warn('⚠️ No session_id found. Please create a session first.');",
									"}"
								],
								"type": "text/javascript"
							}
						},
						{
							"listen": "test",
							"script": {
								"exec": [
									"pm.test('Session details retrieved', function () {",
									"    const jsonData = pm.response.json();",
									"    pm.expect(jsonData.status).to.eql('success');",
									"    pm.expect(jsonData.messages_count).to.be.a('number');",
									"});",
									"",
									"const jsonData = pm.response.json();",
									"console.log('💬 Messages count: ' + jsonData.messages_count);",
									"console.log('🕐 Last activity: ' + jsonData.last_activity);"
								],
								"type": "text/javascript"
							}
						}
					],
					"request": {
						"method": "GET",
						"header": [],
						"url": {
							"raw": "{{base_url}}/api/{{api_version}}/sessions/{{session_id}}",
							"host": [
								"{{base_url}}"
							],
							"path": [
								"api",
								"{{api_version}}",
								"sessions",
								"{{session_id}}"
							]
						},
						"description": "Get details of current session"
					},
					"response": []
				},
				{
					"name": "List All Sessions",
					"request": {
						"method": "GET",
						"header": [],
						"url": {
							"raw": "{{base_url}}/api/{{api_version}}/sessions?page=1&per_page=10",
							"host": [
								"{{base_url}}"
							],
							"path": [
								"api",
								"{{api_version}}",
								"sessions"
							],
							"query": [
								{
									"key": "page",
									"value": "1"
								},
								{
									"key": "per_page",
									"value": "10"
								}
							]
						},
						"description": "List all active sessions with pagination"
					},
					"response": []
				}
			],
			"description": "Session management endpoints for conversation tracking"
		},
		{
			"name": "🖼️ Image Management",
			"item": [
				{
					"name": "Upload Image",
					"event": [
						{
							"listen": "prerequest",
							"script": {
								"exec": [
									"console.log('📤 Preparing image upload...');",
									"console.log('ℹ️ Make sure to select an image file in the Body -> form-data section');"
								],
								"type": "text/javascript"
							}
						},
						{
							"listen": "test",
							"script": {
								"exec": [
									"pm.test('Image uploaded successfully', function () {",
									"    const jsonData = pm.response.json();",
									"    pm.expect(jsonData.status).to.eql('success');",
									"    pm.expect(jsonData.image.id).to.be.a('string');",
									"});",
									"",
									"// Store image ID for use in other requests",
									"const jsonData = pm.response.json();",
									"const imageId = jsonData.image.id;",
									"pm.collectionVariables.set('image_id', imageId);",
									"",
									"console.log('🖼️ Image ID: ' + imageId);",
									"console.log('📁 Filename: ' + jsonData.image.filename);",
									"console.log('📏 Size: ' + (jsonData.image.size / 1024).toFixed(2) + ' KB');",
									"console.log('🔗 Access URL: ' + jsonData.access_url);"
								],
								"type": "text/javascript"
							}
						}
					],
					"request": {
						"method": "POST",
						"header": [],
						"body": {
							"mode": "formdata",
							"formdata": [
								{
									"key": "file",
									"description": "Select dental image file to upload",
									"type": "file",
									"src": []
								}
							]
						},
						"url": {
							"raw": "{{base_url}}/api/{{api_version}}/images",
							"host": [
								"{{base_url}}"
							],
							"path": [
								"api",
								"{{api_version}}",
								"images"
							]
						},
						"description": "Upload a dental image for analysis"
					},
					"response": []
				},
				{
					"name": "Get Image (File)",
					"event": [
						{
							"listen": "prerequest",
							"script": {
								"exec": [
									"const imageId = pm.collectionVariables.get('image_id');",
									"if (!imageId) {",
									"    console.warn('⚠️ No image_id found. Please upload an image first.');",
									"}"
								],
								"type": "text/javascript"
							}
						}
					],
					"request": {
						"method": "GET",
						"header": [],
						"url": {
							"raw": "{{base_url}}/api/{{api_version}}/images/{{image_id}}?format=file",
							"host": [
								"{{base_url}}"
							],
							"path": [
								"api",
								"{{api_version}}",
								"images",
								"{{image_id}}"
							],
							"query": [
								{
									"key": "format",
									"value": "file"
								}
							]
						},
						"description": "Get uploaded image as file"
					},
					"response": []
				},
				{
					"name": "Get Image (Base64)",
					"request": {
						"method": "GET",
						"header": [],
						"url": {
							"raw": "{{base_url}}/api/{{api_version}}/images/{{image_id}}?format=base64",
							"host": [
								"{{base_url}}"
							],
							"path": [
								"api",
								"{{api_version}}",
								"images",
								"{{image_id}}"
							],
							"query": [
								{
									"key": "format",
									"value": "base64"
								}
							]
						},
						"description": "Get uploaded image as base64 JSON"
					},
					"response": []
				},
				{
					"name": "List Images",
					"request": {
						"method": "GET",
						"header": [],
						"url": {
							"raw": "{{base_url}}/api/{{api_version}}/images?page=1&per_page=10",
							"host": [
								"{{base_url}}"
							],
							"path": [
								"api",
								"{{api_version}}",
								"images"
							],
							"query": [
								{
									"key": "page",
									"value": "1"
								},
								{
									"key": "per_page",
									"value": "10"
								}
							]
						},
						"description": "List all uploaded images"
					},
					"response": []
				}
			],
			"description": "Image upload and management endpoints"
		},
		{
			"name": "🤖 AI Agent Interaction",
			"item": [
				{
					"name": "Chat with AI Agent (Text Only)",
					"event": [
						{
							"listen": "prerequest",
							"script": {
								"exec": [
									"// Generate random dental question for testing",
									"const dentalQuestions = [",
									"    'Apa itu karies gigi?',",
									"    'Bagaimana cara mencegah gigi berlubang?',",
									"    'Apa penyebab sakit gigi?',",
									"    'Berapa kali sikat gigi dalam sehari?',",
									"    'Apa fungsi gigi geraham?'",
									"];",
									"const randomQuestion = dentalQuestions[Math.floor(Math.random() * dentalQuestions.length)];",
									"pm.collectionVariables.set('random_question', randomQuestion);",
									"",
									"console.log('💭 Sample question: ' + randomQuestion);"
								],
								"type": "text/javascript"
							}
						},
						{
							"listen": "test",
							"script": {
								"exec": [
									"pm.test('AI Agent response received', function () {",
									"    const jsonData = pm.response.json();",
									"    pm.expect(jsonData.status).to.eql('success');",
									"    pm.expect(jsonData.assistant_message.content).to.be.a('string');",
									"});",
									"",
									"const jsonData = pm.response.json();",
									"console.log('🤖 Agent: ' + jsonData.assistant_message.content.substring(0, 100) + '...');",
									"",
									"// Track resources if agent generated any",
									"if (jsonData.resources && jsonData.resources.length > 0) {",
									"    pm.collectionVariables.set('resource_id', jsonData.resources[0]);",
									"    console.log('📎 Agent generated resources: ' + jsonData.resources.length);",
									"}"
								],
								"type": "text/javascript"
							}
						}
					],
					"request": {
						"method": "POST",
						"header": [],
						"body": {
							"mode": "raw",
							"raw": "{\n    \"message\": \"{{random_question}}\"\n}",
							"options": {
								"raw": {
									"language": "json"
								}
							}
						},
						"url": {
							"raw": "{{base_url}}/api/{{api_version}}/chat?session_id={{session_id}}",
							"host": [
								"{{base_url}}"
							],
							"path": [
								"api",
								"{{api_version}}",
								"chat"
							],
							"query": [
								{
									"key": "session_id",
									"value": "{{session_id}}"
								}
							]
						},
						"description": "Natural conversation with AI agent (text only)"
					},
					"response": []
				},
				{
					"name": "Chat with AI Agent (With Image)",
					"event": [
						{
							"listen": "prerequest",
							"script": {
								"exec": [
									"const imageId = pm.collectionVariables.get('image_id');",
									"if (!imageId) {",
									"    console.warn('⚠️ No image_id found. Please upload an image first.');",
									"} else {",
									"    console.log('🖼️ Using image ID: ' + imageId);",
									"    console.log('🤖 Agent will autonomously decide what analysis to perform');",
									"}"
								],
								"type": "text/javascript"
							}
						},
						{
							"listen": "test",
							"script": {
								"exec": [
									"pm.test('AI Agent processed image', function () {",
									"    const jsonData = pm.response.json();",
									"    pm.expect(jsonData.status).to.eql('success');",
									"});",
									"",
									"const jsonData = pm.response.json();",
									"if (jsonData.analysis) {",
									"    console.log('🔍 Image processed: ' + jsonData.analysis.image_processed);",
									"    console.log('📊 Visualizations: ' + jsonData.analysis.visualizations_generated);",
									"}",
									"",
									"// Store latest resource ID if agent generated visualizations",
									"if (jsonData.resources && jsonData.resources.length > 0) {",
									"    pm.collectionVariables.set('resource_id', jsonData.resources[0]);",
									"    console.log('🎯 Agent generated: ' + jsonData.resources[0]);",
									"}"
								],
								"type": "text/javascript"
							}
						}
					],
					"request": {
						"method": "POST",
						"header": [],
						"body": {
							"mode": "raw",
							"raw": "{\n    \"message\": \"Analisis gambar dental ini dan berikan diagnosis.\",\n    \"image_id\": \"{{image_id}}\"\n}",
							"options": {
								"raw": {
									"language": "json"
								}
							}
						},
						"url": {
							"raw": "{{base_url}}/api/{{api_version}}/chat?session_id={{session_id}}",
							"host": [
								"{{base_url}}"
							],
							"path": [
								"api",
								"{{api_version}}",
								"chat"
							],
							"query": [
								{
									"key": "session_id",
									"value": "{{session_id}}"
								}
							]
						},
						"description": "Natural conversation with image - Agent decides analysis autonomously"
					},
					"response": []
				},
				{
					"name": "Request Specific Analysis",
					"event": [
						{
							"listen": "test",
							"script": {
								"exec": [
									"pm.test('Agent processed request', function () {",
									"    const jsonData = pm.response.json();",
									"    pm.expect(jsonData.status).to.eql('success');",
									"});",
									"",
									"const jsonData = pm.response.json();",
									"if (jsonData.resources && jsonData.resources.length > 0) {",
									"    pm.collectionVariables.set('resource_id', jsonData.resources[0]);",
									"    console.log('🎨 Agent created visualization: ' + jsonData.resources[0]);",
									"}"
								],
								"type": "text/javascript"
							}
						}
					],
					"request": {
						"method": "POST",
						"header": [],
						"body": {
							"mode": "raw",
							"raw": "{\n    \"message\": \"Bisakah anda tunjukkan gigi seri pada gambar ini?\",\n    \"image_id\": \"{{image_id}}\"\n}",
							"options": {
								"raw": {
									"language": "json"
								}
							}
						},
						"url": {
							"raw": "{{base_url}}/api/{{api_version}}/chat?session_id={{session_id}}",
							"host": [
								"{{base_url}}"
							],
							"path": [
								"api",
								"{{api_version}}",
								"chat"
							],
							"query": [
								{
									"key": "session_id",
									"value": "{{session_id}}"
								}
							]
						},
						"description": "Request specific visualization - Agent autonomously decides tools"
					},
					"response": []
				}
			],
			"description": "Natural AI agent interaction - Agent decides tools autonomously"
		},
		{
			"name": "🎨 Generated Resources",
			"item": [
				{
					"name": "Get Visualization (File)",
					"event": [
						{
							"listen": "prerequest",
							"script": {
								"exec": [
									"const resourceId = pm.collectionVariables.get('resource_id');",
									"if (!resourceId) {",
									"    console.warn('⚠️ No resource_id found. Please chat with agent to generate visualizations first.');",
									"} else {",
									"    console.log('🎯 Using resource ID: ' + resourceId);",
									"}"
								],
								"type": "text/javascript"
							}
						},
						{
							"listen": "test",
							"script": {
								"exec": [
									"pm.test('Visualization file retrieved', function () {",
									"    pm.response.to.have.status(200);",
									"    pm.expect(pm.response.headers.get('Content-Type')).to.include('image');",
									"});",
									"",
									"console.log('🖼️ Visualization downloaded successfully');",
									"console.log('📁 Content-Type: ' + pm.response.headers.get('Content-Type'));",
									"console.log('📏 Size: ' + (pm.response.stream.length / 1024).toFixed(2) + ' KB');"
								],
								"type": "text/javascript"
							}
						}
					],
					"request": {
						"method": "GET",
						"header": [],
						"url": {
							"raw": "{{base_url}}/api/{{api_version}}/resources/{{resource_id}}?format=file",
							"host": [
								"{{base_url}}"
							],
							"path": [
								"api",
								"{{api_version}}",
								"resources",
								"{{resource_id}}"
							],
							"query": [
								{
									"key": "format",
									"value": "file"
								}
							]
						},
						"description": "Get generated visualization as file"
					},
					"response": []
				},
				{
					"name": "Get Visualization (Base64)",
					"request": {
						"method": "GET",
						"header": [],
						"url": {
							"raw": "{{base_url}}/api/{{api_version}}/resources/{{resource_id}}?format=base64",
							"host": [
								"{{base_url}}"
							],
							"path": [
								"api",
								"{{api_version}}",
								"resources",
								"{{resource_id}}"
							],
							"query": [
								{
									"key": "format",
									"value": "base64"
								}
							]
						},
						"description": "Get generated visualization as base64 JSON"
					},
					"response": []
				}
			],
			"description": "Access visualizations generated by AI agent"
		}
	],
	"event": [
		{
			"listen": "prerequest",
			"script": {
				"type": "text/javascript",
				"exec": [
					"// Global pre-request script for Dentalization AI Agent API",
					"console.log('🤖 AI Agent Request: ' + pm.info.requestName);",
					"",
					"// Set default headers",
					"pm.request.headers.add({",
					"    key: 'Content-Type',",
					"    value: 'application/json'",
					"});",
					"",
					"// Log request details",
					"console.log('📍 Endpoint: ' + pm.request.method + ' ' + pm.request.url);",
					"",
					"// Check required environment variables",
					"const requiredVars = ['base_url', 'api_version'];",
					"requiredVars.forEach(varName => {",
					"    if (!pm.environment.get(varName) && !pm.collectionVariables.get(varName)) {",
					"        console.warn('⚠️ Missing variable: ' + varName);",
					"    }",
					"});"
				]
			}
		},
		{
			"listen": "test",
			"script": {
				"type": "text/javascript",
				"exec": [
					"// Global post-response script for Dentalization AI Agent API",
					"console.log('✅ Response received: ' + pm.response.status + ' ' + pm.response.reason);",
					"",
					"// Basic response validation",
					"pm.test('Response time is reasonable', function () {",
					"    pm.expect(pm.response.responseTime).to.be.below(30000);",
					"});",
					"",
					"pm.test('Response has valid content type', function () {",
					"    const contentType = pm.response.headers.get('Content-Type');",
					"    pm.expect(contentType).to.include('application/json');",
					"});",
					"",
					"// Status code validation",
					"if (pm.response.code >= 200 && pm.response.code < 300) {",
					"    pm.test('✅ Request successful', function () {",
					"        pm.response.to.be.success;",
					"    });",
					"} else if (pm.response.code >= 400) {",
					"    pm.test('❌ Client/Server error detected', function () {",
					"        pm.response.to.be.error;",
					"    });",
					"    console.error('Error response:', pm.response.json());",
					"}",
					"",
					"// Log response summary",
					"try {",
					"    const jsonData = pm.response.json();",
					"    if (jsonData.status) {",
					"        console.log('📋 Status: ' + jsonData.status);",
					"    }",
					"    if (jsonData.message) {",
					"        console.log('💬 Message: ' + jsonData.message);",
					"    }",
					"} catch (e) {",
					"    console.log('📄 Non-JSON response received');",
					"}"
				]
			}
		}
	],
	"variable": [
		{
			"key": "base_url",
			"value": "http://localhost:8000",
			"type": "string"
		},
		{
			"key": "api_version",
			"value": "v1",
			"type": "string"
		},
		{
			"key": "service_version",
			"value": ""
		},
		{
			"key": "service_uptime",
			"value": ""
		},
		{
			"key": "session_id",
			"value": ""
		},
		{
			"key": "image_id",
			"value": ""
		},
		{
			"key": "resource_id",
			"value": ""
		},
		{
			"key": "random_question",
			"value": ""
		}
	]
}
