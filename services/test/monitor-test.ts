import { KafkaContainer } from '@testcontainers/kafka';
import { GenericContainer } from 'testcontainers';
import { Kafka, Consumer, Producer } from 'kafkajs';
import supertest from 'supertest';
import type { StartedTestContainer } from 'testcontainers';

/**
 * Test monitor that starts Kafka + Kafka UI and keeps them running
 * for manual testing and message visualization
 */
export class TestMonitor {
  private kafkaContainer?: StartedTestContainer;
  private kafkaUIContainer?: StartedTestContainer;
  private kafka?: Kafka;
  private consumer?: Consumer;
  private producer?: Producer;

  async start() {
    console.log('🚀 Starting Test Monitor...');
    
    // Start Kafka container
    console.log('📦 Starting Kafka container...');
    this.kafkaContainer = await new KafkaContainer('confluentinc/cp-kafka:7.4.0')
      .withStartupTimeout(60000)
      .start();

    const kafkaHost = this.kafkaContainer.getHost();
    const kafkaPort = this.kafkaContainer.getMappedPort(9093);
    const brokers = [`${kafkaHost}:${kafkaPort}`];
    
    console.log(`✅ Kafka running at: ${brokers[0]}`);

    // Setup Kafka client
    this.kafka = new Kafka({
      clientId: 'test-monitor',
      brokers,
    });

    // Start Kafka UI container
    console.log('🖥️  Starting Kafka UI...');
    this.kafkaUIContainer = await new GenericContainer('provectuslabs/kafka-ui:latest')
      .withEnvironment({
        'KAFKA_CLUSTERS_0_NAME': 'test-cluster',
        'KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS': `${kafkaHost}:${kafkaPort}`,
        'KAFKA_CLUSTERS_0_ZOOKEEPER': ''
      })
      .withExposedPorts(8080)
      .withStartupTimeout(30000)
      .start();

    const uiPort = this.kafkaUIContainer.getMappedPort(8080);
    console.log(`🎛️  Kafka UI available at: http://localhost:${uiPort}`);

    // Setup consumer for monitoring
    this.consumer = this.kafka.consumer({ groupId: 'monitor-consumer' });
    await this.consumer.connect();
    await this.consumer.subscribe({ topics: ['shoots', 'invitations'], fromBeginning: true });

    // Setup producer for testing
    this.producer = this.kafka.producer();
    await this.producer.connect();

    // Monitor messages
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const value = message.value?.toString();
        console.log(`📨 [${topic}] ${value}`);
      },
    });

    return {
      kafkaBrokers: brokers,
      kafkaUIUrl: `http://localhost:${uiPort}`,
      shootServiceUrl: 'http://localhost:3001'
    };
  }

  async sendTestMessage() {
    if (!this.producer) throw new Error('Monitor not started');
    
    const testEvent = {
      eventId: `evt_${Date.now()}`,
      timestamp: new Date().toISOString(),
      eventType: 'test.message',
      message: 'Test message from monitor'
    };

    await this.producer.send({
      topic: 'shoots',
      messages: [{
        key: testEvent.eventId,
        value: JSON.stringify(testEvent),
      }]
    });

    console.log('✅ Test message sent');
  }

  async testShootService(shootServiceUrl: string) {
    console.log('🧪 Testing shoot service...');
    
    const shootData = {
      title: 'Monitor Test Shoot',
      clientEmail: 'monitor@example.com',
      photographerId: 'photographer_monitor'
    };

    try {
      const response = await supertest(shootServiceUrl)
        .post('/shoots')
        .send(shootData)
        .expect(201);

      console.log('✅ Shoot created:', response.body);
    } catch (error) {
      console.log('❌ Shoot service test failed:', error);
    }
  }

  async stop() {
    console.log('🛑 Stopping Test Monitor...');
    await this.consumer?.disconnect();
    await this.producer?.disconnect();
    await this.kafkaUIContainer?.stop();
    await this.kafkaContainer?.stop();
    console.log('✅ Monitor stopped');
  }
}

// If run directly, start the monitor
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new TestMonitor();
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    await monitor.stop();
    process.exit(0);
  });

  monitor.start().then(async (config) => {
    console.log('\n🎯 Test Monitor Ready!');
    console.log(`📊 Kafka UI: ${config.kafkaUIUrl}`);
    console.log(`⚡ Kafka Brokers: ${config.kafkaBrokers.join(', ')}`);
    console.log(`🎯 Shoot Service: ${config.shootServiceUrl}`);
    console.log('\n💡 Commands:');
    console.log('- Send test message: curl -X POST http://localhost:3000/test-message');
    console.log('- Test shoot service: curl -X POST http://localhost:3001/shoots -H "Content-Type: application/json" -d \'{"title":"Test","clientEmail":"test@example.com","photographerId":"photo_123"}\'');
    console.log('- Press Ctrl+C to stop\n');

    // Send a test message every 30 seconds
    setInterval(() => {
      monitor.sendTestMessage().catch(console.error);
    }, 30000);

    // Test shoot service if available
    await monitor.testShootService(config.shootServiceUrl);
  }).catch(console.error);
}