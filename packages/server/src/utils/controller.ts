import MetadataKeys from './metadata.js';

const Controller = (basePath: string): ClassDecorator => {
  return (target) => {
    Reflect.defineMetadata(MetadataKeys.BASE_PATH, basePath, target);
  };
};

export default Controller;
