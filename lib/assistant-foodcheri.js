const Foodcheri = require('node-foodcheri');
const foodcheri = new Foodcheri({
  apiKey: 'IPHONEV1C4H63LX9G632'
});

const moment = require('moment')

const REFRESH_DELAY = 60 * 1000 // 1mn

class AssistantFoodcheri {
  constructor({
    email,
    password
  }) {
    this.email = email
    this.password = password
    this.current_step = {}
  }

  init(plugins) {
    this.plugins = plugins
    if (!this.email || !this.password) {
      return Promise.reject('[assistant-foodcheri] Erreur : vous devez configurer ce plugin !')
    }
    return Promise.resolve(this)
  }

  setCurrentStep(step) {
    this.current_step = step
  }

  resetCurrentStep() {
    this.current_step = {}
  }

  async followOrder() {
    try {
      await foodcheri.login(this.email, this.password);
      const order = await foodcheri.getLastOrder();

      if (
        order.status !==
        this.current_step.status
      ) {
        this.setCurrentStep(order)
        const eta = moment(order.estimated_delivery_time_live).diff(
          moment(),
          'minutes'
        );
        if (this.plugins.notifier) {
          this.plugins.notifier.action(`Votre livraison en est à l'étape: ${
              order.status
            }, elle arrivera dans ${eta} minutes`)
        }
      }

      if (
        order.status === 'DONE' ||
        order.status === 'UNDELIVERED_FOODCHERI' ||
        order.status === 'CANCELLED'
      ) {
        this.resetCurrentStep()
      } else {
        setTimeout(async () => await this.trackOrder(),
          REFRESH_DELAY)
      }
    } catch (err) {
      console.log('error with followOrder', err);
    }
  }

  action(commande) {
    switch (commande) {
      case 'track':
        return await this.followOrder()
      default:
        break;
    }
  }
}

exports.init = (configuration, plugins) => {
  return new AssistantFoodcheri(configuration).init(plugins)
    .then(resource => {
      console.log('[assistant-foodcheri] Plugin chargé et prêt.')
      return resource
    })
}