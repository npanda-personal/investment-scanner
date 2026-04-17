import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import { ScannerService } from '../../scanners/service';

interface MarketData {
  symbol: string;
  price: number;
  timestamp: Date;
  volume?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

export class MarketWebSocketServer {
  private wss: WebSocketServer;
  private scannerService: ScannerService;
  private subscribedSymbols: Set<string> = new Set();
  private mockInterval?: NodeJS.Timeout;

  constructor(server: HTTPServer) {
    this.wss = new WebSocketServer({ server, path: '/ws/market' });
    this.scannerService = new ScannerService();
    this.setup();
  }

  private setup() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New WebSocket client connected');
      ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to market data stream' }));

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('Invalid message from client:', error);
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    // Start mock data broadcast (replace with real data feed)
    this.startMockBroadcast();
  }

  private handleMessage(ws: WebSocket, message: any) {
    switch (message.type) {
      case 'subscribe':
        if (message.symbols && Array.isArray(message.symbols)) {
          message.symbols.forEach((sym: string) => this.subscribedSymbols.add(sym));
          ws.send(JSON.stringify({ type: 'subscribed', symbols: Array.from(this.subscribedSymbols) }));
          console.log(`Client subscribed to symbols: ${message.symbols.join(', ')}`);
        }
        break;
      case 'unsubscribe':
        if (message.symbols && Array.isArray(message.symbols)) {
          message.symbols.forEach((sym: string) => this.subscribedSymbols.delete(sym));
          ws.send(JSON.stringify({ type: 'unsubscribed', symbols: Array.from(this.subscribedSymbols) }));
        }
        break;
      case 'list':
        ws.send(JSON.stringify({ type: 'symbols', symbols: Array.from(this.subscribedSymbols) }));
        break;
      default:
        ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
    }
  }

  /**
   * Broadcast market data to all connected clients.
   */
  broadcastMarketData(data: MarketData) {
    const payload = JSON.stringify({
      type: 'market',
      ...data,
    });
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
    // Optionally evaluate scanner rules on this new data
    this.evaluateScannerRules(data);
  }

  /**
   * Evaluate active scanner rules against the new market data.
   * This is a simplified version – in production you would evaluate all active rules
   * for the specific symbol and potentially across a time window.
   */
  private async evaluateScannerRules(_data: MarketData) {
    try {
      // For now, just trigger the scanActiveRules which will evaluate all rules.
      // This is inefficient; better to evaluate only rules that involve this symbol.
      await this.scannerService.scanActiveRules();
    } catch (error) {
      console.error('Error evaluating scanner rules:', error);
    }
  }

  /**
   * Start a mock data generator that broadcasts random price updates every 3 seconds.
   */
  private startMockBroadcast() {
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META'];
    this.mockInterval = setInterval(() => {
      if (this.subscribedSymbols.size === 0) {
        // If no subscriptions, still broadcast a random symbol for demo
        symbols.forEach(sym => this.subscribedSymbols.add(sym));
      }
      this.subscribedSymbols.forEach(symbol => {
        const previousPrice = 100 + Math.random() * 2000;
        const change = (Math.random() - 0.5) * 10;
        const price = previousPrice + change;
        const marketData: MarketData = {
          symbol,
          price,
          timestamp: new Date(),
          open: previousPrice,
          high: previousPrice + Math.random() * 5,
          low: previousPrice - Math.random() * 5,
          close: price,
          volume: Math.floor(Math.random() * 1000000),
        };
        this.broadcastMarketData(marketData);
      });
    }, 3000);
    console.log('Mock market data broadcast started');
  }

  /**
   * Stop the mock broadcast (cleanup).
   */
  stop() {
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
    }
    this.wss.close();
  }
}