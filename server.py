import http.server
import socketserver
import mimetypes
import sys
import os

# Fix MIME types for Windows registry issues
# This is critical for ES6 modules which require application/javascript
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/javascript', '.mjs')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('text/html', '.html')

class Handler(http.server.SimpleHTTPRequestHandler):
    def guess_type(self, path):
        # Correctly determine MIME types, fixing Windows Registry issues
        base, ext = os.path.splitext(path)
        if ext.lower() == '.js':
            return 'application/javascript'
        if ext.lower() == '.mjs':
            return 'application/javascript'
        if ext.lower() == '.glb':
            return 'model/gltf-binary'
        if ext.lower() == '.gltf':
            return 'model/gltf+json'
        # Fallback to default behavior for other files
        return super().guess_type(path)

    def end_headers(self):
        # Add debug header
        #self.send_header('X-Debug-Server', 'Custom-Python-Fix-v2')
        
        # Enable CORS for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        # Disable caching to ensure latest changes are verified
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

PORT = 8081
# Allow port configuration via command line
if len(sys.argv) > 1:
    try:
        PORT = int(sys.argv[1])
    except ValueError:
        pass

print(f"Starting custom server on http://localhost:{PORT}")
print("Serving .js files as application/javascript (Fixing Windows MIME type issue)")
#print("DEBUG MODE: ON")

# Allow reusing the address to avoid "Address already in use" errors on restart
socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    try:
        print("Press Ctrl+C to stop the server")
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
