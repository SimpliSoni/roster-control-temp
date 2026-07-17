 # External control using web component 
 
#### Purpose 

This documentation outlines the process of creating external controls using web components. External controls are UI components that interact with external data sources or APIs, allowing dynamic functionality in web applications. 

#### Prerequisites 

* Basic knowledge of HTML, CSS, and JavaScript. 
* Familiarity with web components and their lifecycle. 

**Introduction to Web Components**  

Web Components are a set of standards that allow you to create reusable and encapsulated components. A Web Component can be used to encapsulate its internal logic, styling, and structure, making it reusable and portable across different web applications. 

The core technologies behind Web Components are: 

**Custom Elements** are a key feature of the Web Components standard, which allows developers to create reusable, encapsulated HTML elements with custom functionality. These elements are built using a combination of HTML, JavaScript, and CSS, enabling developers to define their own elements that behave like native HTML elements.

## 1. Setup angular project with a component :

**1. Install Node.js and Angular CLI**

Before starting, make sure that you have Node.js installed. If not, download and install ``(either 18.19.1, 20.11.1, or 22.0.0)``  it from **https://nodejs.org/**.

**Text editor - We recommend [Visual Studio Code](https://code.visualstudio.com/)**

Once Node.js is installed, install package by running this command in your terminal or command prompt:
```typescript
npm install -g @angular/cli
```
 
**2. Create a New Angular Project**
To create a new Angular project, open your terminal or command prompt and run:
```typescript
ng new calendar-control
```
This will set up a new Angular project in the folder ```calendar-control```. You can replace ```calendar-control``` with any name you prefer.

Running your new project locally:

In your terminal, switch to your new Angular project.

```cmd
cd calendar-control
```

**3. Generate a New Component**
Once you are in your Angular project directory, use the Angular CLI to generate a new component. Run this command:
```typescript
ng generate component calendar-control
```
This will generate a new component with the name **calendar-control**. 

The files created are:

**calendar-control.component.ts** — The TypeScript file where the logic of the component is written.

**calendar-control.component.html** — The HTML template file where the structure of the component is defined.

**calendar-control.component.css** — The CSS file where the styles for the component can be added.

**calendar-control.component.spec.ts** — The spec file for unit testing the component.


## 2. Install devun-core

* Download the files from the [devum-core](https://github.com/jayalakshmi48/devum-core)  project and place them inside project.

* **Then, add that path in the package.json file like this:**

* **For example:**

```typescript
 "dependencies": {"external-den-core": "file:./package/den-core"}
 ```

**Next, run npm install and import the required files.**

* The ``Devum-core`` provides the functionalities of the Devum framework, with the ``ExternalCoreSimpleControl`` class serving as the main class that includes all the methods for data binding. 

 ## Usage
 
* ``ControlPropertyDefinitionValue, DsResult, DsResultValue, RtOption`` : The class is highly useful in systems that need to track and manage data changes. This could be in cases where data is being synced between different systems, persisted to a database, or manipulated in an application that requires tracking of changes to datasets.


*  **ExternalCoreSimpleAngularControl**
   * The ``ExternalCoreSimpleAngularControl`` class is an abstract class in TypeScript, designed for use within an Angular application, possibly within a component or control system that integrates external or third-party controls.
   * ``onDatasourceResolved: (data: RtOption<any>) => void;``
This is a function type property. The onDatasourceResolved property is a callback function that takes an argument of type RtOption<any> (likely a wrapper around some result or data). It is used to handle the event when the data source has been resolved or fetched.

   * ``RtOption<any>``: This is presumably a type that represents some result or option (could be a generic wrapper around a data value or a result set). any indicates that the data can be of any type.
   
   * ``setControlInstance: (controlInstance: any) => void;`` This method takes a controlInstance and sets it. It is likely used to bind or assign a reference to an control instance. The purpose is to interact with an external control.Through this controlInstance external control can access all the required methods and properties.

   * ``applyConfigurationAttributes: (attributeValue: UsableAttributeValue<unknown>[]) => void;``This method allows applying an array of attributeValues to the control instance. Each attributeValue would define settings or configurations for how the control behaves, possibly altering its appearance or functionality.
   * ``applyPropertyDefinitions: (propertyDefinitions: ControlPropertyDefinitionValue[]) => void;``This method allows applying an array of property definitions (ControlPropertyDefinitionValue[]) to the control instance. Each property definition defines data binding for the control.


* The **@Input()** decorator allows the parent component to bind a value or function to the child component. In this case, it's used to pass a function (a callback) from the parent to the child.
**onDatasourceResolved**  is the name of the input property in the child component. The parent will bind a function to this property, and the child component can call it.
By convention, variables or properties with a leading underscore (like onDatasourceResolved) are often used to indicate that the property is intended for internal use, though this is just a naming convention and not enforced by Angular.
**Function Signature:**
The = (data: RtOption<any>) => {} part is an inline function definition (an arrow function).
The function takes an argument data of type RtOption<any>, which suggests that the data passed to this function follows the structure of the RtOption type, which could be a generic object used to hold various types of data.
**Type RtOption<any>:**
RtOption<any> is a type definition, and any indicates that the type is flexible (it can accept any type of data). RtOption is a custom type that defines the structure of the data passed into the function.
```typescript
    @Input() onDatasourceResolved = (data: RtOption<any>) => {
        if (data.isDefined) {
        <!--do something-->
        }
    }
```
**@Input()**
* decorator tells Angular that the property or method it is applied to can be set by a parent component. It makes the setControlInstance function available for the parent to bind data to.

**setControlInstance:**
* setControlInstance is the name of the setter method in the child component. It will be called automatically whenever the parent component binds a value to the setControlInstance property.
* It is defined as a function rather than a direct property so that custom logic can be added inside the function if necessary, such as additional processing or validation.

**controlInstance:**

* The parameter controlInstance represents the value passed by the parent component. The any type means that it can accept any type of data (object, string, array, etc.).

**Assignment (this.controlInstance = controlInstance):**
* Inside the setter function, the value of controlInstance passed by the parent is assigned to a local property this.controlInstance within the child component.
* This allows the child component to use this.controlInstance as a property, which could be accessed in the component’s template or used for further logic.
```typescript
    @Input() setControlInstance = (controlInstance: any) => {
        this.controlInstance = controlInstance;
    }
```
* Create required example external label control enum
```typescript
export enum PropertyDefinitionEnum {
    VALUE = 'value',
}
```
**@Input()**
* decorator tells Angular that the property or method it is applied to can be set by a parent component. It makes the applyPropertyDefinitions function available for the parent to bind data to.
```typescript
    @Input() applyPropertyDefinitions = (propertyDefinitions: ControlPropertyDefinitionValue[]) => {
        this.propertyDefinition = propertyDefinitions.find(pd => pd.controlAttributeName == PropertyDefinitionEnum.VALUE);
        this.displayPropertyName = this.propertyDefinition?.dsPropertyName as string;
    }
```
**@Input()**
* decorator tells Angular that the property or method it is applied to can be set by a parent component. It makes the applyConfigurationAttributes function available for the parent to bind data to.
* The applyConfigurationAttributes method can be used to modify the data based on the configuration.
```typescript
   @Input() applyConfigurationAttributes(configurationAttributeValues: UsableAttributeValue<unknown>[]) {

    }
```

    
* The @Output() decorator is used to bind an event to the parent component. It allows the child component to send data or notify the parent component about certain actions or events.
```typescript
    @Output() emitCustomEvent = new EventEmitter();
```

**4: Edit the Component**
Now, you can open the generated files and start modifying them:

**calendar-control.component.html**
This is the HTML template for the component. You can bind the properties and display dynamic data here.

* Add the html label tag and respective bindings,event/function **onChange()**

```html
<label (click)="onChange()">{{defaultValue}}</label>
```

**calendar-control.component.ts**
This is the TypeScript file for the component. Here, you'll define the component’s behavior.
* **Declare component selector and use devum-core**
```typescript

import { CommonModule } from "@angular/common";
import { AfterViewInit, Component, EventEmitter, Input, NgModule, OnChanges, OnDestroy, Output, SimpleChanges } from "@angular/core";
import { ControlInstanceWrapper, ControlPropertyDefinitionValue, DsResultValue, ExternalCoreSimpleControl, RtOption, UsableAttributeValue } from "external-den-core";

export enum PropertyDefinitionEnum {
    VALUE = 'value',
}
@Component({
    selector: 'calendar-control',
    template: `<label (click)="onChange()">{{defaultValue}}</label>`,
})

export class ExternalLabelComponent implements ExternalCoreSimpleControl, OnChanges {

    private propertyDefinition: ControlPropertyDefinitionValue;
    private dsPropertyName: string = '';
    private controlInstance: ControlInstanceWrapper;
    defaultValue = 'ExternalLabel';
    
    @Input() inputValue: string = '';
    @Output() emitCustomEvent = new EventEmitter();

    constructor() { }

    @Input() onDatasourceResolved = (data: RtOption<any>) => {
        if (data.isDefined) {
            const dsBoundProperty: DsResultValue = data.get?.data.find(ds => ds.fieldName === this.dsPropertyName);
            if (dsBoundProperty) this.defaultValue = dsBoundProperty.referenceData.isDefined ? dsBoundProperty.referenceData.get : dsBoundProperty.value;
        } else {
            this.defaultValue = this.applyDefaultValue(this.controlInstance, PropertyDefinitionEnum.VALUE, this.defaultValue);
        }
    }
    @Input() setControlInstance = (controlInstance: ControlInstanceWrapper) => {
        this.controlInstance = controlInstance;
    }
    @Input() applyPropertyDefinitions = (propertyDefinitions: ControlPropertyDefinitionValue[]) => {
        this.propertyDefinition = propertyDefinitions.find(pd => pd.controlAttributeName == PropertyDefinitionEnum.VALUE) as ControlPropertyDefinitionValue;
        this.dsPropertyName = this.propertyDefinition?.dsPropertyName as string;
    }

    @Input() applyConfigurationAttributes(_configurationAttributeValues: UsableAttributeValue<unknown>[]) { }


    onChange() {
        this.emitCustomEvent.emit({ event: 'click', data: null });
    }
    ngOnChanges(changes: SimpleChanges): void {
        if (changes?.['inputValue']?.currentValue) {
            this.defaultValue = changes['inputValue'].currentValue;
        }
    }
    private applyDefaultValue(controlInstance: ControlInstanceWrapper, propertyDefinitionValue: string, label: string) {
        let defaultValue;
        let propertyDefinition = controlInstance.getPropertyDefinition(propertyDefinitionValue);
        if (propertyDefinition?.value) {
            defaultValue = propertyDefinition.value;
        } else {
            defaultValue = label;
        }
        return defaultValue;
    }

}
@NgModule({
    declarations: [ExternalLabelComponent],
    imports: [CommonModule],
    exports: [ExternalLabelComponent]
})
export class ExternalLabelModule { }
```

**5: Use the Component in the Application**
To use the newly created component, you need to add its selector (defined in calendar-control.component.ts) to a template file. For example, to use it in **index.html/app.component.html**:
```html
<calendar-control.component></calendar-control.component>
```
**6: Run the Application**
Finally, run the application to see the component in action:
```typescript
ng serve
```
OUTPUT 

![](https://devum-client-public-bucket.s3.amazonaws.com/geotech/images/images/calendar-control1)


## Transforming Angular component to web component

Until now, we only have a component which only works inside an Angular project. However, our goal is to transform the external label component to a custom element, so that it can be used outside of the Angular app project in any JavaScript application.

Open the src/app.module.ts file and start by adding the following imports.
```typescript
    import  { Injector} from '@angular/core';
    import  { createCustomElement } from '@angular/elements';
```

Next, add ExternalLabelComponent to the bootstrap array of the appModule,call the createCustomElement() method to **transform the component to a custom element** that we adequately called calendar-control-widget:

```typescript
import { Injector, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { createCustomElement } from '@angular/elements';
import { CommonModule } from '@angular/common';
import { ExternalLabelComponent, ExternalLabelModule } from './calendar-control/calendar-control-component';
@NgModule({
  imports: [BrowserModule, FormsModule, CommonModule, ExternalLabelModule]
})

export class AppModule {

  constructor(private injector: Injector) {
    const el = createCustomElement(ExternalLabelComponent, { injector: this.injector });
    if (!customElements.get('calendar-control-widget')) {
      customElements.define('calendar-control-widget', el);
    }
  }
  ngDoBootstrap() { }

}
```

* After adding the code for transforming our Angular component to a custom element, let’s now build the web component, so we can use it in other projects without depending on Angular. 

* Head back to your terminal and run the following command from the root of your project: 

  ```typescript 
  ng build --configuration production --output-hashing none
  ```


* This command will build the project for production and will create a dist/external-lib folder with the built files. We only need the following JavaScript files to use our web component: 

   `runtime.js`

   `es2015-polyfills.js` 

   `polyfills.js `

   `scripts.js` 

   `Main.js`
   
   ## Using web component

* After compiling our project and getting a bunch of JavaScript files, let’s see how we can use web components outside of Angular. 
* First, we need to check if the component works properly: 
* Go to the folder and create an index.html file. 
* Copy the JS files mentioned above from the /dist folder of the Angular project 
* Open the index.html file and add the following HMTL elements: 
```html
<!DOCTYPE html> 
<html lang="en"> 
    <head> 
      <meta charset="UTF-8"> 
      <meta name="viewport" content="width=device-width, initial-scale=1.0"> 
      <meta http-equiv="X-UA-Compatible" content="ie=edge"> 
      <title>Testing the LabelWeb Component</title> 
      <base href="/"> 
    </head> 
    <body> 
      <calendar-control-widget></calendar-control-widget> 
      <script type="text/javascript" src="runtime.js"></script> 
      <script type="text/javascript" src="es2015-polyfills.js" nomodule></script> 
      <script type="text/javascript" src="polyfills.js"></script> 
      <script type="text/javascript" src="scripts.js"></script> 
      <script type="text/javascript" src="main.js"></script> 
    </body> 
    </html>
```

* Next, make sure you are inside the folder where you have created the index.html file and run the following command: 

  ```typescript 
  ng serve
  ```

**Concatenating web component files**

* To be able to use our web component, we need to include the five JavaScript files which – let's be honest – is not convenient. The solution is to concatenate all these files into one JS file. 

* First, run the following command from the root of your Angular project to install the concat and fs-extra packages: 

  ```typescript 
  npm install --save-dev concat fs-extra
  ```

 * Inside the root of your project, create a build-component.js file and add the following code 
```typescript 
const fs = require('fs-extra');
const concat = require('concat');

build = async () =>{
    const files = [
        './dist/external-lib/runtime.js',
        './dist/external-lib/polyfills.js',
        './dist/external-lib/main.js'
      ];
    
      await fs.ensureDir('widget');
      await concat(files, 'widget/calendar-control-widget.js');
}
build();
```
* Next, add the following script to the package.json file of your Angular project: 
```typescript
{
  "name": "external-lib",
  "private": true,
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "build:component": "ng build --configuration production --output-hashing none && node build-component.js"
  },
```
* Finally, you can run your script to build your project and concatenate the files into one JavaScript file that can be used wherever you want to use your web component to display news. Head back to your terminal and run the following command:
  ```typescript 
  npm run build: component
  ```

* When the process has finished, in your app root you should find a /widget folder with the calendar-control-widget.js file. Go to the /widget folder, upload the js file in s3 list or any server.