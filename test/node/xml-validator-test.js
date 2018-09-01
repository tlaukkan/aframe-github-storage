const assert = require('assert');
const XmlValidator = require('../../src/node/xml-validator').XmlValidator;

describe('xml-validator-test', function() {

    it('should validate xml', async function() {
        const testXml = "<a-entity id='1.a' invalid-attribute-1='1.a.value'><a-entity id='2.a'><a-entity id='3.a'></a-entity><a-entity id='3.b'>invalid-content-1</a-entity></a-entity><a-entity id='2.b' invalid-attribute-2='2.b.value'>invalid-content-2</a-entity></a-entity>";
        const xmlValidator = new XmlValidator('^a-entity$', '^id$');
        const result = await xmlValidator.validate(testXml);
        assert.strictEqual(result.length, 4);
    });
});