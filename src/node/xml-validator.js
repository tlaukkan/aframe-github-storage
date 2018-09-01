var parseString = require('xml2js').parseString;

exports.XmlValidator = class {

    /**
     * @param {String} elementRegExpPattern
     * @param {String} attributeRegExpPattern
     */
    constructor(elementRegExpPattern, attributeRegExpPattern) {
        this.elementRegexp= new RegExp(elementRegExpPattern);
        this.attributeRegexp = new RegExp(attributeRegExpPattern);
    }

    /**
     * @param {String} xml
     * @returns {Promise<Array<String>>}
     */
    validate(xml) {
        return new Promise((resolve, reject) => {
            parseString(xml, (err, rootElement) => {
                if (err) {
                    reject(err);
                }
                const errors =this.validateFragment(rootElement);
                resolve(errors);
            })
        });
    }

    /**
     * @param {Object} element
     * @returns {Array<String>}
     */
    validateFragment(element) {
        const errors = [];
        for (const property in element) {
            if (element.hasOwnProperty(property)) {
                const value = element[property];
                this.addErrors(errors, this.validateElement(property, value));
            }
        }
        return errors;
    }

    /**
     * @param {String} elementName
     * @param {Array<Object>} elements
     * @returns {Array<String>}
     */
    validateElements(elementName, elements) {
        const errors = [];
        for (const element of elements) {
            this.addErrors(errors, this.validateElement(elementName, element));
        }
        return errors;
    }

    /**
     * @param {String} elementName
     * @param {Object} element
     * @returns {Array<String>}
     */
    validateElement(elementName, element) {
        const errors = [];
        if (!this.elementRegexp.exec(elementName)) {
            this.addError(errors, 'Invalid element name: ' + elementName);
        }
        for (const property in element) {
            if (element.hasOwnProperty(property)) {
                const value = element[property];
                if ('$' === property) {
                    this.addErrors(errors, this.validateAttributes(elementName, value));
                } else if ('_' === property) {
                    this.addErrors(errors, this.validateCharacterContent(elementName, value));
                } else {
                    this.addErrors(errors, this.validateElements(property, value));
                }
            }
        }
        return errors;
    }

    /**
     * @param {String} elementName
     * @param {Object} attributes
     * @returns {Array<String>}
     */
    validateAttributes(elementName, attributes) {
        const errors = [];
        for (const attribute in attributes) {
            if (attributes.hasOwnProperty(attribute)) {
                const value = attributes[attribute];
                if (!this.attributeRegexp.exec(attribute)) {
                    this.addError(errors, 'Invalid attribute name: ' + attribute);
                }
                //console.log('Validating attribute: '+ elementName + '.' + attribute + '=' + value);
            }
        }
        return errors;
    }

    /**
     * @param {String} elementName
     * @param {String} content
     * @returns {Array<String>}
     */
    validateCharacterContent(elementName, content) {
        const errors = [];
        this.addError(errors, 'Invalid character content: ' + content);
        //console.log('Validating content: '+ elementName + ':' + content);
        return errors;
    }

    /**
     * @param {Array<String>}errors
     * @param {String} newError
     */
    addError(errors, newError) {
        errors.push(newError);
    }

    /**
     * @param {Array<String>} errors
     * @param {Array<String>} newErrors
     */
    addErrors(errors, newErrors) {
        for (const newError of newErrors) {
            errors.push(newError);
        }
    }
};